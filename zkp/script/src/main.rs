use actix_cors::Cors;
use actix_web::{http, web, App, HttpResponse, HttpServer, Responder};
use flate2::read::GzDecoder;
use num_bigint::{BigInt, ToBigInt};
use serde::{Deserialize, Serialize};
use sp1_prover::{SP1ProvingKey, SP1VerifyingKey};
use sp1_sdk::{utils, ProverClient, SP1Stdin};
use std::collections::HashMap;
use std::io::Read;

#[derive(Clone)]
struct AppState {
    pk: SP1ProvingKey,
    vk: SP1VerifyingKey,
}

#[derive(Debug, Serialize)]
struct QrResponse {
    reference_id: String,
    last_4_digits: String,
    is_valid: bool,
}

#[derive(Debug)]
struct AadhaarSecureQr {
    data: HashMap<String, String>,
}

impl AadhaarSecureQr {
    fn extract_reference_id_and_last_4(&self) -> Option<(String, String)> {
        self.data.get("referenceid").map(|reference_id| {
            let last_4 = reference_id.chars().rev().take(4).collect::<String>();
            let last_4_digits = last_4.chars().rev().collect::<String>();
            (reference_id.clone(), last_4_digits)
        })
    }

    fn new(decompressed_array: &[u8]) -> Self {
        let mut data = HashMap::new();
        let field_names = [
            "version",
            "email_mobile_status",
            "referenceid",
            "name",
            "dob",
            "gender",
            "careof",
            "district",
            "landmark",
            "house",
            "location",
            "pincode",
            "postoffice",
            "state",
            "street",
            "subdistrict",
            "vtc",
            "last_4_digits_mobile_no",
        ];
        let fields: Vec<&[u8]> = decompressed_array.split(|&b| b == 0xFF).collect();
        for (field_name, field_bytes) in field_names.iter().zip(fields.iter()) {
            data.insert(
                field_name.to_string(),
                String::from_utf8_lossy(field_bytes).trim().to_string(),
            );
        }
        AadhaarSecureQr { data }
    }
}

fn is_secure_qr(data: &str) -> bool {
    !data.trim().starts_with('<')
        && !data.trim().starts_with("<?xml")
        && !data.trim().starts_with("<PrintLetterBarcodeData")
}

fn process_secure_qr(data: &str) -> Result<AadhaarSecureQr, Box<dyn std::error::Error>> {
    let cleaned_data = data
        .chars()
        .filter(|c| c.is_ascii_digit())
        .collect::<String>();

    let big_int = BigInt::parse_bytes(cleaned_data.as_bytes(), 10)
        .or_else(|| process_large_numeric_qr(&cleaned_data).ok())
        .ok_or("Failed to parse QR data as BigInt")?;

    let hex = format!("{:0x}", big_int);
    let hex_padded = if hex.len() % 2 != 0 {
        format!("0{}", hex)
    } else {
        hex
    };

    let bytes: Vec<u8> = (0..hex_padded.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(&hex_padded[i..i + 2], 16).ok())
        .collect();

    let mut decompressed = Vec::new();
    if GzDecoder::new(&bytes[..])
        .read_to_end(&mut decompressed)
        .is_ok()
    {
        Ok(AadhaarSecureQr::new(&decompressed))
    } else {
        Ok(AadhaarSecureQr::new(&bytes))
    }
}

fn process_large_numeric_qr(data: &str) -> Result<BigInt, Box<dyn std::error::Error>> {
    const CHUNK_SIZE: usize = 100;
    let ten = 10.to_bigint().unwrap();
    let mut result = BigInt::default();

    for (i, chunk) in data.as_bytes().chunks(CHUNK_SIZE).enumerate() {
        let chunk_str = std::str::from_utf8(chunk)?;
        let chunk_num = BigInt::parse_bytes(chunk_str.as_bytes(), 10)
            .ok_or_else(|| format!("Invalid chunk at position {}", i))?;
        result = result * ten.pow((data.len() - i * CHUNK_SIZE - chunk.len()) as u32) + chunk_num;
    }
    Ok(result)
}

#[derive(Deserialize)]
struct QrRequest {
    qr_data: String,
}

async fn process_qr(data: web::Json<QrRequest>, app_state: web::Data<AppState>) -> impl Responder {
    let qr_data = data.qr_data.trim();
    if !is_secure_qr(qr_data) {
        return HttpResponse::BadRequest().json(QrResponse {
            reference_id: "".to_string(),
            last_4_digits: "".to_string(),
            is_valid: false,
        });
    }

    let secure_qr = match process_secure_qr(qr_data) {
        Ok(qr) => qr,
        Err(_) => {
            return HttpResponse::BadRequest().json(QrResponse {
                reference_id: "".to_string(),
                last_4_digits: "".to_string(),
                is_valid: false,
            })
        }
    };

    let (reference_id, last_4_digits) = match secure_qr.extract_reference_id_and_last_4() {
        Some((id, digits)) => (id, digits),
        None => {
            return HttpResponse::BadRequest().json(QrResponse {
                reference_id: "".to_string(),
                last_4_digits: "".to_string(),
                is_valid: false,
            })
        }
    };

    let mut stdin = SP1Stdin::new();
    stdin.write(&reference_id);
    stdin.write(&last_4_digits);

    let client = ProverClient::from_env();
    // Pass a reference to stdin as expected by prove().
    let proof = match client.prove(&app_state.pk, &stdin).compressed().run() {
        Ok(proof) => proof,
        Err(_) => {
            return HttpResponse::InternalServerError().json(QrResponse {
                reference_id,
                last_4_digits,
                is_valid: false,
            })
        }
    };

    match client.verify(&proof, &app_state.vk) {
        Ok(_) => HttpResponse::Ok().json(QrResponse {
            reference_id,
            last_4_digits,
            is_valid: true,
        }),
        Err(_) => HttpResponse::Ok().json(QrResponse {
            reference_id,
            last_4_digits,
            is_valid: false,
        }),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    utils::setup_logger();
    const ELF: &[u8] = include_bytes!("../../program/elf/aadhaar-program");
    let client = ProverClient::from_env();
    let (pk, vk) = client.setup(ELF);
    let app_state = web::Data::new(AppState { pk, vk });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_origin("https://arkham-eight.vercel.app")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec![
                http::header::AUTHORIZATION,
                http::header::ACCEPT,
                http::header::CONTENT_TYPE,
            ])
            .supports_credentials()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(app_state.clone())
            .route("/process-qr", web::post().to(process_qr))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

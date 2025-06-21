#![no_main]
sp1_zkvm::entrypoint!(main);

use aadhar_lib::PublicValuesStruct;
use alloy_sol_types::SolType;

pub fn main() {
    let reference_id: String = sp1_zkvm::io::read();
    let aadhar_last_four: String = sp1_zkvm::io::read();

    assert!(
        aadhar_last_four.len() == 4,
        "Aadhar last four must be exactly 4 digits"
    );

    assert!(
        reference_id.len() >= 4,
        "Reference ID must have at least 4 characters"
    );

    let ref_first_four: String = reference_id.chars().take(4).collect();

    let is_valid = ref_first_four == aadhar_last_four;

    let bytes = PublicValuesStruct::abi_encode(&PublicValuesStruct {
        ref_first_four,
        aadhar_last_four,
        is_valid,
    });

    sp1_zkvm::io::commit_slice(&bytes);
}

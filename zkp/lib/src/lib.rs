use alloy_sol_types::sol;

sol! {
    struct PublicValuesStruct {
        string ref_first_four;
        string aadhar_last_four;
        bool is_valid;
    }
}

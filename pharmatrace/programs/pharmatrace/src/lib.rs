use anchor_lang::prelude::*;

declare_id!("4rJojVK6QajDMFy14dpyKomvjJp3DLhkNHRpB1gygY7e");

#[program]
pub mod pharmatrace {
    use super::*;

    pub fn register_drug(
        ctx: Context<RegisterDrug>,
        batch_id: String,
        drug_name: String,
        manufacturer: String,
        manufacture_date: String,
        expiry_date: String,
        quantity: u64,
    ) -> Result<()> {
        let drug = &mut ctx.accounts.drug_record;
        drug.batch_id = batch_id;
        drug.drug_name = drug_name;
        drug.manufacturer = manufacturer;
        drug.manufacture_date = manufacture_date;
        drug.expiry_date = expiry_date;
        drug.quantity = quantity;
        drug.status = 1;
        drug.authority = ctx.accounts.authority.key();
        Ok(())
    }
}

#[account]
pub struct DrugRecord {
    pub batch_id: String,
    pub drug_name: String,
    pub manufacturer: String,
    pub manufacture_date: String,
    pub expiry_date: String,
    pub quantity: u64,
    pub status: u8,
    pub authority: Pubkey,
}

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct RegisterDrug<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + 32 + 4 + 64 + 4 + 64 + 4 + 16 + 4 + 16 + 8 + 1 + 32,
        seeds = [batch_id.as_bytes()],
        bump
    )]
    pub drug_record: Account<'info, DrugRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

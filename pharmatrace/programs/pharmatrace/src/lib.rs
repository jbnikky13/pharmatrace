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
        drug.current_holder = ctx.accounts.authority.key();
        drug.status = 1;
        drug.timestamp = Clock::get()?.unix_timestamp;
        drug.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn transfer_drug(
        ctx: Context<TransferDrug>,
        new_status: u8,
    ) -> Result<()> {
        let drug = &mut ctx.accounts.drug_record;
        require!(
            drug.authority == ctx.accounts.authority.key(),
            PharmaError::Unauthorized
        );
        drug.current_holder = ctx.accounts.new_holder.key();
        drug.authority = ctx.accounts.new_holder.key();
        drug.status = new_status;
        drug.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn flag_counterfeit(ctx: Context<FlagDrug>) -> Result<()> {
        let drug = &mut ctx.accounts.drug_record;
        drug.status = 99;
        drug.timestamp = Clock::get()?.unix_timestamp;
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
    pub current_holder: Pubkey,
    pub status: u8,
    pub timestamp: i64,
    pub authority: Pubkey,
}

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct RegisterDrug<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 64 + 64 + 64 + 16 + 16 + 8 + 32 + 1 + 8 + 32,
        seeds = [b"drug", batch_id.as_bytes()],
        bump
    )]
    pub drug_record: Account<'info, DrugRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferDrug<'info> {
    #[account(mut)]
    pub drug_record: Account<'info, DrugRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: storing new holder key
    pub new_holder: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct FlagDrug<'info> {
    #[account(mut)]
    pub drug_record: Account<'info, DrugRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[error_code]
pub enum PharmaError {
    #[msg("Only the current holder can transfer this drug record")]
    Unauthorized,
}
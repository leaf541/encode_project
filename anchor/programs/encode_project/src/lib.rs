#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod encode_project {
    use super::*;

  pub fn close(_ctx: Context<CloseEncodeProject>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.encode_project.count = ctx.accounts.encode_project.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.encode_project.count = ctx.accounts.encode_project.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeEncodeProject>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.encode_project.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeEncodeProject<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + EncodeProject::INIT_SPACE,
  payer = payer
  )]
  pub encode_project: Account<'info, EncodeProject>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseEncodeProject<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub encode_project: Account<'info, EncodeProject>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub encode_project: Account<'info, EncodeProject>,
}

#[account]
#[derive(InitSpace)]
pub struct EncodeProject {
  count: u8,
}

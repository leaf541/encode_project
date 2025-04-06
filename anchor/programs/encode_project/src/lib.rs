use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod encode_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, house_edge: u8) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        game_state.authority = ctx.accounts.authority.key();
        game_state.house_edge = house_edge;
        game_state.total_bets = 0;
        game_state.total_wins = 0;
        Ok(())
    }

    // pub fn roll_dice() -> Result<()> {
    //     Ok(())
    // }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GameState::LEN,
        seeds = [b"game_state"],
        bump
    )]
    pub game_state: Account<'info, GameState>,
    /// CHECK: This is the game's vault account
    #[account(
        seeds = [b"game_vault"],
        bump
    )]
    pub game_vault: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GameState {
    pub authority: Pubkey,
    pub house_edge: u8,
    pub total_bets: u64,
    pub total_wins: u64,
}

impl GameState {
    pub const LEN: usize = 32 + 1 + 8 + 8;
}

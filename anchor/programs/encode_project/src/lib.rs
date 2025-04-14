use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

declare_id!("5NnmKs3bcjoheaDrVTogrgwtVKMTvnB8SSDtomcyH6N2");

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

    pub fn roll_dice(ctx: Context<RollDice>, bet_amount: u64, selected_number: u8) -> Result<()> {
        require!(bet_amount >= LAMPORTS_PER_SOL / 10, ErrorCode::BetTooSmall);

        require!((1..=6).contains(&selected_number), ErrorCode::InvalidNumber);

        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player.key(),
            &ctx.accounts.game_vault.key(),
            bet_amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.player.to_account_info(),
                ctx.accounts.game_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let clock = Clock::get()?;
        let random_seed = clock.unix_timestamp as u64;
        let random_number =
            ((random_seed ^ ctx.accounts.player.key().to_bytes()[0] as u64) % 6) + 1;

        let game_state = &mut ctx.accounts.game_state;
        game_state.total_bets = game_state.total_bets.checked_add(1).unwrap();

        if random_number as u8 == selected_number {
            let gross_win = bet_amount.checked_mul(2).unwrap();
            let house_edge_amount = (gross_win as u128)
                .checked_mul(game_state.house_edge as u128)
                .unwrap()
                .checked_div(100)
                .unwrap();
            let win_amount = gross_win.checked_sub(house_edge_amount as u64).unwrap();

            let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.game_vault.key(),
                &ctx.accounts.player.key(),
                win_amount,
            );

            anchor_lang::solana_program::program::invoke_signed(
                &transfer_ix,
                &[
                    ctx.accounts.game_vault.to_account_info(),
                    ctx.accounts.player.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[&[b"game_vault", &[ctx.bumps.game_vault]]],
            )?;

            game_state.total_wins = game_state.total_wins.checked_add(1).unwrap();
            msg!(
                "Player WON! Selected: {}, Rolled: {}, Payout: {} lamports",
                selected_number,
                random_number,
                win_amount
            );
        } else {
            msg!(
                "Player LOST. Selected: {}, Rolled: {}",
                selected_number,
                random_number
            );
        }

        Ok(())
    }
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

#[derive(Accounts)]
pub struct RollDice<'info> {
    #[account(
        mut,
        seeds = [b"game_state"],
        bump
    )]
    pub game_state: Account<'info, GameState>,
    /// CHECK: This is the game's vault account
    #[account(
        mut,
        seeds = [b"game_vault"],
        bump
    )]
    pub game_vault: AccountInfo<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
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

#[error_code]
pub enum ErrorCode {
    #[msg("Bet amount must be at least 0.1 SOL")]
    BetTooSmall,
    #[msg("Selected number must be between 1 and 6")]
    InvalidNumber,
}

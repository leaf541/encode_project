use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

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

    pub fn roll_dice(
        ctx: Context<RollDice>,
        bet_amount: u64,
        bet_type: BetType,
        bet_value: u8,
    ) -> Result<()> {
        require!(bet_amount >= LAMPORTS_PER_SOL / 10, ErrorCode::BetTooSmall);

        match bet_type {
            BetType::SingleNumber => require!(
                bet_value >= 2 && bet_value <= 12,
                ErrorCode::InvalidBetValue
            ),
            BetType::EvenOdd => {
                require!(bet_value == 0 || bet_value == 1, ErrorCode::InvalidBetValue)
            }
            BetType::LowHigh => {
                require!(bet_value == 0 || bet_value == 1, ErrorCode::InvalidBetValue)
            }
        }

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
        let player_key_bytes = ctx.accounts.player.key().to_bytes();

        let die1 = ((random_seed ^ player_key_bytes[0] as u64) % 6) + 1;
        let die2 = ((random_seed ^ player_key_bytes[1] as u64) % 6) + 1;
        let total = die1 + die2;

        let game_state = &mut ctx.accounts.game_state;
        game_state.total_bets = game_state.total_bets.checked_add(1).unwrap();

        let (is_win, multiplier) = match bet_type {
            BetType::SingleNumber => {
                let win = total == bet_value as u64;
                (win, if win { 10 } else { 0 })
            }
            BetType::EvenOdd => {
                let is_even = total % 2 == 0;
                let win = (is_even && bet_value == 0) || (!is_even && bet_value == 1);
                (win, if win { 2 } else { 0 })
            }
            BetType::LowHigh => {
                let is_high = total >= 7;
                let win = (is_high && bet_value == 1) || (!is_high && bet_value == 0);
                (win, if win { 3 } else { 0 })
            }
        };

        if is_win {
            let house_edge_amount = (bet_amount as u128)
                .checked_mul(game_state.house_edge as u128)
                .unwrap()
                .checked_div(100)
                .unwrap();

            let win_amount = if bet_type == BetType::LowHigh {
                (bet_amount as u128)
                    .checked_mul(3)
                    .unwrap()
                    .checked_div(2)
                    .unwrap()
                    .checked_sub(house_edge_amount)
                    .unwrap()
            } else {
                (bet_amount as u128)
                    .checked_mul(multiplier as u128)
                    .unwrap()
                    .checked_sub(house_edge_amount)
                    .unwrap()
            };

            let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.game_vault.key(),
                &ctx.accounts.player.key(),
                win_amount as u64,
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
                "Player won! Dice: {} + {} = {}, Winnings: {} lamports",
                die1,
                die2,
                total,
                win_amount
            );
        } else {
            msg!("Player lost! Dice: {} + {} = {}", die1, die2, total);
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BetType {
    SingleNumber,
    EvenOdd,
    LowHigh,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Bet amount must be at least 0.1 SOL")]
    BetTooSmall,
    #[msg("Invalid bet value for the selected bet type")]
    InvalidBetValue,
}

'use client'

import { getEncodeProjectProgram, getEncodeProjectProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { SystemProgram } from '@solana/web3.js'
import { BN } from '@project-serum/anchor';

export function useEncodeProjectProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getEncodeProjectProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getEncodeProjectProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['encode_project', 'all', { cluster }],
    queryFn: () => program.account.encode_project.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['encode_project', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ encode_project: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useEncodeProjectProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useEncodeProjectProgram()

  const accountQuery = useQuery({
    queryKey: ['encode_project', 'fetch', { cluster, account }],
    queryFn: () => program.account.encode_project.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['encode_project', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ encode_project: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['encode_project', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ encode_project: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['encode_project', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ encode_project: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const diceRollMutation = useMutation({
    mutationKey: ['encode_project', 'rollDice', { cluster, account }],
    mutationFn: (params: { betAmount: number, betType: number, betValue: number }) => {
      
      const { betAmount, betType, betValue } = params;
      const betAmountBN = new BN(betAmount);

      const anchorBetType = betType === 0 
        ? { singleNumber: {} } 
        : betType === 1 
          ? { evenOdd: {} } 
          : { lowHigh: {} };

      const [gameStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_state")],
        program.programId
      );
      
      const [gameVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_vault")],
        program.programId
      );

      const ctx = {
        accounts: {
          gameState: gameStatePda,
          gameVault: gameVaultPda,
          player: program.provider.publicKey,
          systemProgram: SystemProgram.programId
        }
      }
      
      return program.methods
        .rollDice(
          betAmountBN,
          anchorBetType,
          betValue
        )
        .signers([])
        .rpc(ctx as any);
    },
    onSuccess: (tx) => {
      transactionToast(tx);
      return accountQuery.refetch();
    }
  });

  const setMutation = useMutation({
    mutationKey: ['encode_project', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ encode_project: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    diceRollMutation,
    setMutation,
  }
}

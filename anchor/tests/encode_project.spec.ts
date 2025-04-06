import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair } from '@solana/web3.js'
import { EncodeProject } from '../target/types/encode_project'

describe('encode_project', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.EncodeProject as Program<EncodeProject>

  const encode_projectKeypair = Keypair.generate()

  it('Initialize EncodeProject', async () => {
    await program.methods
      .initialize()
      .accounts({
        encode_project: encode_projectKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([encode_projectKeypair])
      .rpc()

    const currentCount = await program.account.encode_project.fetch(encode_projectKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment EncodeProject', async () => {
    await program.methods.increment().accounts({ encode_project: encode_projectKeypair.publicKey }).rpc()

    const currentCount = await program.account.encode_project.fetch(encode_projectKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment EncodeProject Again', async () => {
    await program.methods.increment().accounts({ encode_project: encode_projectKeypair.publicKey }).rpc()

    const currentCount = await program.account.encode_project.fetch(encode_projectKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement EncodeProject', async () => {
    await program.methods.decrement().accounts({ encode_project: encode_projectKeypair.publicKey }).rpc()

    const currentCount = await program.account.encode_project.fetch(encode_projectKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set encode_project value', async () => {
    await program.methods.set(42).accounts({ encode_project: encode_projectKeypair.publicKey }).rpc()

    const currentCount = await program.account.encode_project.fetch(encode_projectKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the encode_project account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        encode_project: encode_projectKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.encode_project.fetchNullable(encode_projectKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})

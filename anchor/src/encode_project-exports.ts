// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Cluster, PublicKey } from '@solana/web3.js';
import EncodeProjectIDL from '../target/idl/encode_project.json';
import type { EncodeProject } from '../target/types/encode_project';

// Re-export the generated IDL and type
export { EncodeProject, EncodeProjectIDL };

// The programId is imported from the program IDL.
export const ENCODE_PROJECT_PROGRAM_ID = new PublicKey(
  EncodeProjectIDL.address
);

// This is a helper function to get the EncodeProject Anchor program.
export function getEncodeProjectProgram(
  provider: AnchorProvider,
  address?: PublicKey
) {
  return new Program(
    {
      ...EncodeProjectIDL,
      address: address ? address.toBase58() : EncodeProjectIDL.address,
    } as EncodeProject,
    provider
  );
}

// This is a helper function to get the program ID for the EncodeProject program depending on the cluster.
export function getEncodeProjectProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the EncodeProject program on devnet and testnet.
      return new PublicKey('5NnmKs3bcjoheaDrVTogrgwtVKMTvnB8SSDtomcyH6N2');
    case 'mainnet-beta':
    default:
      return ENCODE_PROJECT_PROGRAM_ID;
  }
}

'use client';

import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { EncodeProjectIDL } from '@project/anchor';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  AnchorWallet,
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { useRef, useState, useMemo, MutableRefObject } from 'react';
import toast from 'react-hot-toast';
import * as THREE from 'three';

import { useQuery, useQueryClient } from '@tanstack/react-query';

type Rotation = [number, number, number];

type DiceProps = {
  onRollRef?: MutableRefObject<((face: number) => Promise<void>) | null>;
};

type DiceLabelProps = {
  text: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

const FACE_ROTATIONS: Record<number, Rotation> = {
  1: [-Math.PI / 2, 0, 0],
  2: [Math.PI, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [0, 0, 0],
  6: [Math.PI / 2, 0, 0],
};

export function useGetBalance({ address }: { address: PublicKey | null }) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getBalance(address!),
    enabled: !!address,
  });
}

function Dice({ onRollRef }: DiceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [targetRotation, setTargetRotation] = useState<Rotation | null>(null);

  useFrame(() => {
    if (!groupRef.current || !targetRotation) return;

    groupRef.current.rotation.x +=
      (targetRotation[0] - groupRef.current.rotation.x) * 0.1;
    groupRef.current.rotation.y +=
      (targetRotation[1] - groupRef.current.rotation.y) * 0.1;
    groupRef.current.rotation.z +=
      (targetRotation[2] - groupRef.current.rotation.z) * 0.1;
  });

  const rollDiceToFace = async (face: number) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.set(
      groupRef.current.rotation.x + Math.random() * 4 * Math.PI,
      groupRef.current.rotation.y + Math.random() * 4 * Math.PI,
      groupRef.current.rotation.z + Math.random() * 4 * Math.PI
    );

    await new Promise(res => setTimeout(res, 500));

    const [rx, ry, rz] = FACE_ROTATIONS[face] || [0, 0, 0];
    setTargetRotation([rx, ry, rz]);
  };

  if (onRollRef) onRollRef.current = rollDiceToFace;

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[4, 4, 4]} />
        <meshStandardMaterial attach="material-0" color="gray" />
        <meshStandardMaterial attach="material-1" color="lightgray" />
        <meshStandardMaterial attach="material-2" color="white" />
        <meshStandardMaterial attach="material-3" color="white" />
        <meshStandardMaterial attach="material-4" color="darkgray" />
        <meshStandardMaterial attach="material-5" color="white" />
      </mesh>
      <DiceLabels />
    </group>
  );
}

const DiceLabels = () => {
  const faces: DiceLabelProps[] = [
    { text: '1', position: [0, 0, 2.01], rotation: [0, 0, 0] },
    { text: '6', position: [0, 0, -2.01], rotation: [0, Math.PI, 0] },
    { text: '3', position: [-2.01, 0, 0], rotation: [0, -Math.PI / 2, 0] },
    { text: '4', position: [2.01, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { text: '5', position: [0, 2.01, 0], rotation: [-Math.PI / 2, 0, 0] },
    { text: '2', position: [0, -2.01, 0], rotation: [Math.PI / 2, 0, 0] },
  ];

  return (
    <>
      {faces.map((face, i) => (
        <DiceLabel key={i} {...face} />
      ))}
    </>
  );
};

function DiceLabel({ text, position, rotation }: DiceLabelProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, [text]);

  if (!texture) return null;

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[2.5, 2.5]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

export const DiceApp = () => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [amount, setAmount] = useState<number | ''>('');
  const rollRef = useRef<((face: number) => Promise<void>) | null>(null);
  const [singleNumber, setSingleNumber] = useState<number | ''>('');
  const { connection } = useConnection();

  const [isRolling, setIsRolling] = useState(false);
  const { data: balance } = useGetBalance({ address: publicKey });
  const client = useQueryClient();

  const getProgram = () => {
    const provider = new AnchorProvider(connection, wallet as AnchorWallet, {
      commitment: 'confirmed',
    });

    return new Program(EncodeProjectIDL as any, provider);
  };

  const handleRollDice = async () => {
    if (!publicKey || !wallet) {
      toast.error('Connect wallet');
      return;
    }

    if (!balance) {
      toast.error('Your balance is 0!');
      return;
    }

    const program = getProgram();
    if (!program) return;

    try {
      setIsRolling(true);

      const betInLamports = Number(amount) * LAMPORTS_PER_SOL;
      const requiredBalance = betInLamports + 0.002 * LAMPORTS_PER_SOL;

      if (balance < requiredBalance) {
        toast.error(
          `Insufficient balance. You need at least ${
            Number(amount) + 0.002
          } SOL (including fees)`
        );
        setIsRolling(false);
        return;
      }

      const [gameStateKey] = PublicKey.findProgramAddressSync(
        [Buffer.from('game_state')],
        program.programId
      );

      const [gameVaultKey] = PublicKey.findProgramAddressSync(
        [Buffer.from('game_vault')],
        program.programId
      );

      const vaultBalance = await connection.getBalance(gameVaultKey);

      if (vaultBalance < betInLamports * 2) {
        toast.error(
          'Game vault has insufficient funds. Please try a smaller bet amount.'
        );
        setIsRolling(false);
        return;
      }

      const tx = await (program as any).methods
        .rollDice(new BN(betInLamports), singleNumber)
        .accounts({
          gameState: gameStateKey,
          gameVault: gameVaultKey,
          player: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Transaction signature:', tx);

      await connection.confirmTransaction(tx);

      const txDetails = await connection.getTransaction(tx, {
        maxSupportedTransactionVersion: 0,
      });

      if (!txDetails?.meta?.logMessages) {
        throw new Error('Could not fetch transaction details');
      }

      console.log('Transaction logs:', txDetails.meta.logMessages);

      const logs = txDetails.meta.logMessages;

      const resultLog = logs.find(
        log =>
          log.toLowerCase().includes('player') &&
          log.toLowerCase().includes('rolled:')
      );

      if (!resultLog) {
        const errorLog = logs.find(log => log.toLowerCase().includes('error'));
        if (errorLog) {
          throw new Error(`Program error: ${errorLog}`);
        }
        throw new Error(
          'Could not find dice roll result in transaction logs. Check the program logs for more details.'
        );
      }

      const numberMatch = resultLog.match(/Rolled:\s*(\d+)/);

      console.log({ numberMatch });

      if (!numberMatch) {
        throw new Error(`Invalid dice roll result format: ${resultLog}`);
      }

      const rolledNumber = parseInt(numberMatch[1]);

      console.log({ rolledNumber });

      if (isNaN(rolledNumber)) {
        throw new Error(`Invalid dice roll result: ${resultLog}`);
      }

      await rollRef.current?.(rolledNumber);

      if (rolledNumber === singleNumber) {
        toast.success('You won!');
      } else {
        toast.error('You lost!');
      }
    } catch (error) {
      console.log(error);
    } finally {
      client.invalidateQueries({
        queryKey: [
          'get-balance',
          { endpoint: connection.rpcEndpoint, address: publicKey },
        ],
      });
      setIsRolling(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center h-full">
      <Canvas camera={{ position: [5, 5, 5] }} className="w-full h-full flex-1">
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Dice onRollRef={rollRef} />
      </Canvas>
      <div className="flex flex-col flex-1 items-center mb-5">
        <div className="w-full flex flex-1 flex-col items-center space-y-4">
          {!!balance && (
            <div>
              Balance: {Number(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL
            </div>
          )}
          <input
            type="number"
            min={1}
            max={6}
            disabled={isRolling}
            value={singleNumber}
            onChange={e => setSingleNumber(Number(e.target.value))}
            placeholder="Enter number (1-6)"
            className="border px-3 py-2 rounded text-center w-full"
          />
          <input
            type="number"
            placeholder="Bet Amount"
            value={amount}
            disabled={isRolling}
            onChange={e => setAmount(Number(e.target.value))}
            className="border px-3 py-2 rounded text-center w-full"
          />

          <button
            onClick={handleRollDice}
            disabled={isRolling}
            className="px-6 py-2 bg-green-600 text-white rounded shadow"
          >
            Place Bet
          </button>
        </div>
      </div>
    </div>
  );
};

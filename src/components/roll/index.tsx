'use client';
import React, {useEffect} from 'react';
import {useWallet} from "@solana/wallet-adapter-react";
import {useRouter} from 'next/navigation'
import {DiceApp} from "@/components/roll/diceSpace";


export const RollPage = () => {
    const wallet = useWallet();
    const router = useRouter();

    useEffect(() => {
        if (!wallet.connected) {
            router.push('/');
        }
    }, [wallet])
    return <div className={'flex h-full'}>
        <DiceApp/>
    </div>
}

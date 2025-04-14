import {Canvas, useFrame} from '@react-three/fiber';
import {useRef, useState, useMemo, MutableRefObject} from 'react';
import * as THREE from 'three';

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

function Dice({onRollRef}: DiceProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [targetRotation, setTargetRotation] = useState<Rotation | null>(null);

    useFrame(() => {
        if (!groupRef.current || !targetRotation) return;

        groupRef.current.rotation.x += (targetRotation[0] - groupRef.current.rotation.x) * 0.1;
        groupRef.current.rotation.y += (targetRotation[1] - groupRef.current.rotation.y) * 0.1;
        groupRef.current.rotation.z += (targetRotation[2] - groupRef.current.rotation.z) * 0.1;
    });

    const rollDiceToFace = async (face: number) => {
        if (!groupRef.current) return;

        groupRef.current.rotation.set(
            groupRef.current.rotation.x + Math.random() * 4 * Math.PI,
            groupRef.current.rotation.y + Math.random() * 4 * Math.PI,
            groupRef.current.rotation.z + Math.random() * 4 * Math.PI
        );

        await new Promise((res) => setTimeout(res, 500));

        const [rx, ry, rz] = FACE_ROTATIONS[face] || [0, 0, 0];
        setTargetRotation([rx, ry, rz]);
    };

    if (onRollRef) onRollRef.current = rollDiceToFace;

    return (
        <group ref={groupRef}>
            <mesh>
                <boxGeometry args={[4, 4, 4]}/>
                <meshStandardMaterial attach="material-0" color="gray"/>
                <meshStandardMaterial attach="material-1" color="lightgray"/>
                <meshStandardMaterial attach="material-2" color="white"/>
                <meshStandardMaterial attach="material-3" color="white"/>
                <meshStandardMaterial attach="material-4" color="darkgray"/>
                <meshStandardMaterial attach="material-5" color="white"/>
            </mesh>
            <DiceLabels/>
        </group>
    );
}

const DiceLabels = () => {
    const faces: DiceLabelProps[] = [
        {text: '1', position: [0, 0, 2.01], rotation: [0, 0, 0]},
        {text: '6', position: [0, 0, -2.01], rotation: [0, Math.PI, 0]},
        {text: '3', position: [-2.01, 0, 0], rotation: [0, -Math.PI / 2, 0]},
        {text: '4', position: [2.01, 0, 0], rotation: [0, Math.PI / 2, 0]},
        {text: '5', position: [0, 2.01, 0], rotation: [-Math.PI / 2, 0, 0]},
        {text: '2', position: [0, -2.01, 0], rotation: [Math.PI / 2, 0, 0]},
    ];

    return <>{faces.map((face, i) => <DiceLabel key={i} {...face} />)}</>;
};

function DiceLabel({text, position, rotation}: DiceLabelProps) {
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
            <planeGeometry args={[2.5, 2.5]}/>
            <meshBasicMaterial map={texture} transparent/>
        </mesh>
    );
}


export const DiceApp = () => {
    const [betType, setBetType] = useState<'low' | 'high' | 'single'>('low');
    const [singleNumber, setSingleNumber] = useState<number | ''>('');
    const [amount, setAmount] = useState<number | ''>('');
    const rollRef = useRef<((face: number) => Promise<void>) | null>(null);

    const handleRollClickTest = async () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        console.log(`Simulated roll: ${roll}`);
        await rollRef.current?.(roll);
    };
    const handleBetSubmit = () => {
        if (betType === 'single' && (+singleNumber < 1 || +singleNumber > 6)) {
            alert('Enter a valid number between 1 and 6');
            return;
        }

        if (!amount || Number(amount) <= 0) {
            alert('Enter a valid bet amount');
            return;
        }

        // Use these values to process the bet:
        console.log({betType, singleNumber, amount});
    };


    return (
        <div className="w-full flex-1 flex flex-col items-center justify-center">
            <Canvas camera={{position: [5, 5, 5]}} className="w-full h-full flex-1">
                <ambientLight intensity={0.5}/>
                <directionalLight position={[10, 10, 5]} intensity={1}/>
                <Dice onRollRef={rollRef}/>
            </Canvas>
            <div className="flex flex-col flex-1 items-center mb-5">
                <div className="w-full flex flex-1 flex-col items-center space-y-4">
                    <div className="flex space-x-4">
                        <button
                            className={`px-4 py-2 rounded ${betType === 'low' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setBetType('low')}
                        >
                            Low (1–3)
                        </button>
                        <button
                            className={`px-4 py-2 rounded ${betType === 'high' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setBetType('high')}
                        >
                            High (4–6)
                        </button>
                        <button
                            className={`px-4 py-2 rounded ${betType === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setBetType('single')}
                        >
                            Single Number
                        </button>
                    </div>

                    {betType === 'single' && (
                        <input
                            type="number"
                            min={1}
                            max={6}
                            value={singleNumber}
                            onChange={(e) => setSingleNumber(Number(e.target.value))}
                            placeholder="Enter number (1-6)"
                            className="border px-3 py-2 rounded text-center w-full"
                        />
                    )}

                    <input
                        type="number"
                        placeholder="Bet Amount"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="border px-3 py-2 rounded text-center w-full"
                    />

                    <button
                        onClick={handleBetSubmit}
                        className="px-6 py-2 bg-green-600 text-white rounded shadow"
                    >
                        Place Bet
                    </button>
                    <button
                        onClick={handleRollClickTest}
                        className="px-6 py-2 bg-blue-500 text-white rounded shadow"
                    >
                        Roll Dice(Preview)
                    </button>
                </div>
            </div>
        </div>
    );
};

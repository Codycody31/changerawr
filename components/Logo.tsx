import * as React from "react";

const SVGComponent = (props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>) => (
    <svg
        width={325}
        height={50}
        viewBox="0 0 325 50"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <defs>
            <linearGradient
                id="rainbowGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
                gradientUnits="objectBoundingBox"
            >
                <stop offset="0%" stopColor="#186cb8"/>
                <stop offset="19%" stopColor="#186cb8"/>
                <stop offset="20%" stopColor="#2a9a9f"/>
                <stop offset="39%" stopColor="#2a9a9f"/>
                <stop offset="40%" stopColor="#f1b211"/>
                <stop offset="59%" stopColor="#f1b211"/>
                <stop offset="60%" stopColor="#e83611"/>
                <stop offset="79%" stopColor="#e83611"/>
                <stop offset="80%" stopColor="#f9002f"/>
                <stop offset="100%" stopColor="#f9002f"/>
            </linearGradient>
        </defs>
        <g transform="translate(10, -13)">
            <ellipse cx={35} cy={38} rx={18} ry={15} fill="white"/>
            <ellipse cx={58} cy={25} rx={15} ry={12} fill="white"/>
            <ellipse cx={70} cy={28} rx={8} ry={6} fill="white"/>
            <circle cx={65} cy={22} r={2.5} fill="#333"/>
            <circle cx={75} cy={26} r={1} fill="#666"/>
            <path
                d="M 62 32 Q 72 35 76 32"
                stroke="white"
                strokeWidth={2}
                fill="none"
            />
            <ellipse cx={48} cy={30} rx={10} ry={8} fill="white"/>
            <ellipse cx={18} cy={42} rx={15} ry={6} fill="white"/>
            <ellipse cx={5} cy={45} rx={8} ry={4} fill="white"/>
            <ellipse cx={42} cy={48} rx={5} ry={12} fill="white"/>
            <ellipse cx={28} cy={48} rx={5} ry={12} fill="white"/>
            <ellipse cx={42} cy={62} rx={6} ry={3} fill="white"/>
            <ellipse cx={28} cy={62} rx={6} ry={3} fill="white"/>
            <ellipse cx={55} cy={35} rx={2} ry={5} fill="white"/>
            <ellipse cx={50} cy={38} rx={2} ry={5} fill="white"/>
            <circle cx={56} cy={40} r={0.8} fill="white"/>
            <circle cx={51} cy={43} r={0.8} fill="white"/>
        </g>
        <text
            x={100}
            y={40}
            fontFamily="Exo, Arial Black, sans-serif"
            fontSize={36}
            fontWeight={900}
            fill="white"
            stroke="black"
            strokeWidth={2}
            paintOrder="stroke"
            letterSpacing="1px"
        >
            {"Change"}
        </text>
        <text
            x={238}
            y={40}
            fontFamily="Exo, Arial Black, sans-serif"
            fontSize={36}
            fontWeight={900}
            fill="url(#rainbowGradient)"
            stroke="black"
            strokeWidth={2}
            paintOrder="stroke"
            letterSpacing="1px"
        >
            {"rawr"}
        </text>
    </svg>
);
export default SVGComponent;

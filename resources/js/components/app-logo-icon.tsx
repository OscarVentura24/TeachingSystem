import type { SVGAttributes } from 'react';

export default function AppLogoIcon({ className, ...props }: SVGAttributes<SVGElement>) {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            {/* Water Droplet Silhouette */}
            <path
                d="M24 3C24 3 8 20 8 30C8 38.5 15.2 45 24 45C32.8 45 40 38.5 40 30C40 20 24 3 24 3Z"
                fill="currentColor"
                fillOpacity="0.14"
            />
            <path
                d="M24 3C24 3 8 20 8 30C8 38.5 15.2 45 24 45C32.8 45 40 38.5 40 30C40 20 24 3 24 3Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Droplet Light Accent */}
            <path
                d="M24 7C24 7 13 21 13 29C13 32 14.5 35 16.5 37"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.5"
            />

            {/* Mortarboard Diamond (Cap) */}
            <path
                d="M24 14L36 20.5L24 27L12 20.5L24 14Z"
                fill="currentColor"
            />

            {/* Mortarboard Skullcap Arch */}
            <path
                d="M17 23V27.5C17 30 20.1 32 24 32C27.9 32 31 30 31 27.5V23"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Tassel */}
            <path
                d="M33 22V29M31.8 29H34.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />

            {/* Open Book Pages at Base */}
            <path
                d="M11 39C15 37 19.5 37.5 24 40C28.5 37.5 33 37 37 39"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11 42C15 40 19.5 40.5 24 43C28.5 40.5 33 40 37 42"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.6"
            />
        </svg>
    );
}

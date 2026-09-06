import Image from 'next/image';

interface GeminiIconProps {
    size?: number;
    className?: string;
}

export default function GeminiIcon({ size = 16, className = '' }: GeminiIconProps) {
    return (
        <Image
            src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg"
            alt="Gemini"
            width={size}
            height={size}
            className={className}
        />
    );
}

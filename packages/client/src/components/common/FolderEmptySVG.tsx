import React from "react";

interface FolderEmptySVGProps {
  size?: number;
}

const FolderEmptySVG: React.FC<FolderEmptySVGProps> = ({ size = 64 }) => {
  return (
    <svg
      width="195"
      height="131"
      viewBox="0 0 195 131"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="195" height="87.6345" rx="20" fill="#C9DBFF" />
      <g filter="url(#filter0_i_4622_312)">
        <path
          d="M0 45.0022C0 33.9932 0 28.4887 2.1425 24.2838C4.0271 20.585 7.03426 17.5779 10.733 15.6933C14.9379 13.5508 20.4424 13.5508 31.4514 13.5508H71.7567C74.0888 13.5508 75.2549 13.5508 76.4038 13.6865C77.4244 13.8071 78.434 14.0075 79.4233 14.2859C80.537 14.5993 81.6147 15.0447 83.77 15.9355L110.325 26.9109C112.481 27.8017 113.558 28.2471 114.672 28.5605C115.661 28.839 116.671 29.0394 117.692 29.1599C118.841 29.2957 120.007 29.2957 122.339 29.2957H163.549C174.558 29.2957 180.062 29.2957 184.267 31.4382C187.966 33.3228 190.973 36.3299 192.858 40.0286C195 44.2335 195 49.7381 195 60.7471L195 99.5476C195 110.557 195 116.061 192.858 120.266C190.973 123.965 187.966 126.972 184.267 128.857C180.062 130.999 174.558 130.999 163.549 130.999H31.4514C20.4424 130.999 14.9379 130.999 10.733 128.857C7.03426 126.972 4.0271 123.965 2.1425 120.266C0 116.061 0 110.557 0 99.5476V45.0022Z"
          fill="url(#paint0_linear_4622_312)"
        />
      </g>
      <defs>
        <filter
          id="filter0_i_4622_312"
          x="0"
          y="13.5508"
          width="195"
          height="118.449"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="0.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_4622_312"
          />
        </filter>
        <linearGradient
          id="paint0_linear_4622_312"
          x1="97.5"
          y1="13.5508"
          x2="97.5"
          y2="130.999"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D6E4FF" />
          <stop offset="1" stopColor="#D6E3FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default FolderEmptySVG;

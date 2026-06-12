export const USFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="us-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#us-mask)">
            <rect width="20" height="20" fill="#FCFCFC"/>
            <path d="M0 1.538h20M0 4.615h20M0 7.692h20M0 10.769h20M0 13.846h20M0 16.923h20" stroke="#E31D23" strokeWidth="1.54"/>
            <rect width="10.77" height="10.77" fill="#0A3161"/>
            <circle cx="2.2" cy="2.2" r="0.5" fill="#FCFCFC"/>
            <circle cx="5.0" cy="2.2" r="0.5" fill="#FCFCFC"/>
            <circle cx="7.8" cy="2.2" r="0.5" fill="#FCFCFC"/>
            <circle cx="3.6" cy="5.0" r="0.5" fill="#FCFCFC"/>
            <circle cx="6.4" cy="5.0" r="0.5" fill="#FCFCFC"/>
            <circle cx="2.2" cy="7.8" r="0.5" fill="#FCFCFC"/>
            <circle cx="5.0" cy="7.8" r="0.5" fill="#FCFCFC"/>
            <circle cx="7.8" cy="7.8" r="0.5" fill="#FCFCFC"/>
        </g>
    </svg>
);

export const FrenchFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0 border border-zinc-200/60 dark:border-zinc-800" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="fr-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#fr-mask)">
            <rect x="0" width="6.67" height="20" fill="#002395"/>
            <rect x="6.67" width="6.67" height="20" fill="#FCFCFC"/>
            <rect x="13.34" width="6.67" height="20" fill="#ED2939"/>
        </g>
    </svg>
);

export const JapaneseFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0 border border-zinc-200/60 dark:border-zinc-800" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="jp-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#jp-mask)">
            <rect width="20" height="20" fill="#FCFCFC"/>
            <circle cx="10" cy="10" r="4.5" fill="#BC002D"/>
        </g>
    </svg>
);

export const SpanishFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="es-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#es-mask)">
            <rect y="0" width="20" height="5" fill="#C60B1E"/>
            <rect y="5" width="20" height="10" fill="#FBE122"/>
            <rect y="15" width="20" height="5" fill="#C60B1E"/>
        </g>
    </svg>
);

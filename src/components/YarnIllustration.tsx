export default function YarnIllustration() {
  return (
    <svg
      className="yarn-illustration"
      viewBox="0 0 560 500"
      role="img"
      aria-label="Four softly colored balls of wound yarn, with curved strands and loose ends"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="yarn-yellow-clip"><circle cx="265" cy="245" r="145" /></clipPath>
        <clipPath id="yarn-pink-clip"><circle cx="407" cy="348" r="88" /></clipPath>
        <clipPath id="yarn-sage-clip"><circle cx="145" cy="364" r="76" /></clipPath>
        <clipPath id="yarn-blue-clip"><circle cx="431" cy="155" r="58" /></clipPath>
        <radialGradient id="yarn-yellow-shade" cx="35%" cy="28%" r="78%">
          <stop stopColor="#fff0ae" />
          <stop offset=".63" stopColor="#e8d38c" />
          <stop offset="1" stopColor="#c7ad62" />
        </radialGradient>
        <radialGradient id="yarn-pink-shade" cx="34%" cy="26%" r="78%">
          <stop stopColor="#f5d0c8" />
          <stop offset=".68" stopColor="#e5b4af" />
          <stop offset="1" stopColor="#c98f8b" />
        </radialGradient>
        <radialGradient id="yarn-sage-shade" cx="33%" cy="25%" r="80%">
          <stop stopColor="#d8e2ca" />
          <stop offset=".7" stopColor="#a8b99d" />
          <stop offset="1" stopColor="#7f9877" />
        </radialGradient>
        <radialGradient id="yarn-blue-shade" cx="32%" cy="25%" r="80%">
          <stop stopColor="#d2e5eb" />
          <stop offset=".7" stopColor="#afcbd5" />
          <stop offset="1" stopColor="#86a9b7" />
        </radialGradient>
      </defs>

      {/* A generous center skein, with the winding built from tightly spaced strands. */}
      <circle cx="265" cy="245" r="145" fill="url(#yarn-yellow-shade)" />
      <g clipPath="url(#yarn-yellow-clip)" fill="none" strokeLinecap="round">
        <g stroke="#fff3c5" strokeWidth="4.2" opacity=".82">
          <path d="M101 166c47-52 101-67 165-45 53 18 88 59 113 113" />
          <path d="M94 180c49-52 105-65 168-41 52 20 85 60 111 116" />
          <path d="M91 195c50-50 108-61 169-36 50 21 82 62 108 118" />
          <path d="M89 210c51-48 110-57 169-31 48 21 80 63 105 119" />
          <path d="M88 225c53-46 112-52 169-25 47 22 77 63 101 120" />
          <path d="M91 240c53-43 112-47 168-19 45 22 72 64 95 120" />
          <path d="M98 255c54-40 112-41 165-12 42 23 68 63 89 118" />
          <path d="M108 270c53-36 109-34 159-5 40 23 64 62 81 114" />
          <path d="M120 285c50-32 103-27 151 1 37 22 58 59 73 108" />
          <path d="M134 299c47-27 96-20 140 7 34 21 52 55 64 99" />
        </g>
        <g stroke="#a78d4e" strokeWidth="3.4" opacity=".45">
          <path d="M149 89c-30 48-34 103-11 163 21 56 63 103 122 140" />
          <path d="M164 84c-28 49-30 104-5 162 23 53 66 98 125 134" />
          <path d="M180 82c-25 49-25 102 2 157 25 51 68 93 127 127" />
          <path d="M196 82c-22 48-19 99 9 151 26 48 69 87 127 119" />
          <path d="M213 84c-19 46-13 94 16 143 26 44 68 81 123 111" />
          <path d="M230 88c-15 42-7 87 21 131 25 40 65 73 117 100" />
          <path d="M248 94c-11 38 0 77 26 115 24 34 61 63 108 86" />
          <path d="M266 101c-7 32 5 65 29 96 22 28 55 51 95 69" />
          <path d="M284 110c-3 24 9 48 30 69 18 19 45 35 76 47" />
        </g>
        <g stroke="#fff8db" strokeWidth="1.4" opacity=".65">
          <path d="M106 202c66-57 139-55 205 5" />
          <path d="M103 216c67-54 139-50 202 10" />
          <path d="M103 231c67-50 137-44 198 15" />
          <path d="M106 247c66-46 133-38 190 20" />
          <path d="M112 263c63-41 126-31 179 24" />
          <path d="M122 279c59-35 117-23 165 27" />
          <path d="M137 295c52-27 103-14 142 30" />
        </g>
      </g>
      <path d="M179 354c-42 41-72 62-109 55-25-5-38-22-30-39 6-13 23-16 35-7 8 6 7 17 0 22"
        fill="none" stroke="#d3bd78" strokeWidth="5" strokeLinecap="round" />
      <path d="M352 154c27-24 49-46 64-69 11-17 23-20 31-12 8 8 3 19-7 27"
        fill="none" stroke="#e8d38c" strokeWidth="5" strokeLinecap="round" />

      <circle cx="407" cy="348" r="88" fill="url(#yarn-pink-shade)" />
      <g clipPath="url(#yarn-pink-clip)" fill="none" strokeLinecap="round">
        <g stroke="#ffe0d7" strokeWidth="3.4" opacity=".83">
          <path d="M310 300c35-28 70-34 105-16 30 15 50 42 66 78" />
          <path d="M305 312c37-28 72-31 106-12 28 16 47 43 62 79" />
          <path d="M303 325c38-26 73-27 105-7 26 16 43 43 57 77" />
          <path d="M303 338c38-23 73-22 102-2 24 17 39 42 51 74" />
          <path d="M307 351c37-19 70-16 96 5 21 16 34 39 43 67" />
          <path d="M313 364c33-14 63-10 86 11 18 16 28 36 34 60" />
          <path d="M322 377c27-9 52-3 71 16 14 14 21 31 24 51" />
        </g>
        <g stroke="#ac7774" strokeWidth="2.8" opacity=".48">
          <path d="M357 251c-23 32-24 66-3 101 18 30 49 54 90 72" />
          <path d="M371 250c-21 31-20 64 3 96 19 27 49 49 88 64" />
          <path d="M386 252c-18 28-15 58 8 86 19 24 47 42 81 53" />
          <path d="M401 256c-14 23-10 48 12 70 17 18 41 32 70 40" />
          <path d="M416 262c-10 18-4 36 15 51 15 12 34 21 56 25" />
        </g>
      </g>
      <path d="M460 400c25 23 43 40 66 41 14 1 22-8 17-18-4-8-14-10-20-4"
        fill="none" stroke="#dfaaa5" strokeWidth="4" strokeLinecap="round" />

      <circle cx="145" cy="364" r="76" fill="url(#yarn-sage-shade)" />
      <g clipPath="url(#yarn-sage-clip)" fill="none" strokeLinecap="round">
        <g stroke="#e5ebd7" strokeWidth="3.2" opacity=".86">
          <path d="M61 332c30-27 59-32 89-15 24 14 40 37 52 67" />
          <path d="M59 344c31-26 60-29 88-11 23 14 37 37 48 66" />
          <path d="M60 357c31-23 59-24 86-6 21 14 33 36 42 63" />
          <path d="M64 370c29-19 56-19 80 0 18 14 28 34 34 58" />
          <path d="M70 383c25-15 48-13 68 5 15 13 22 30 25 49" />
        </g>
        <g stroke="#73896c" strokeWidth="2.5" opacity=".52">
          <path d="M105 284c-18 27-17 55 3 82 17 23 43 41 76 53" />
          <path d="M119 287c-16 25-13 51 7 75 17 20 41 35 71 44" />
          <path d="M134 291c-12 21-8 42 11 61 15 16 36 27 60 32" />
          <path d="M149 297c-8 15-3 30 13 42 12 9 28 15 46 17" />
        </g>
      </g>

      <circle cx="431" cy="155" r="58" fill="url(#yarn-blue-shade)" />
      <g clipPath="url(#yarn-blue-clip)" fill="none" strokeLinecap="round">
        <g stroke="#e0eef0" strokeWidth="2.8" opacity=".85">
          <path d="M365 137c24-22 47-25 69-11 19 12 31 30 39 54" />
          <path d="M365 149c24-20 47-21 68-7 17 12 28 29 35 52" />
          <path d="M368 161c23-17 44-16 63-2 15 11 24 27 29 47" />
          <path d="M373 173c20-13 38-10 53 4 12 10 18 23 21 39" />
        </g>
        <g stroke="#7899a6" strokeWidth="2.3" opacity=".5">
          <path d="M399 106c-14 20-12 40 4 58 13 14 32 24 55 30" />
          <path d="M414 108c-11 16-7 32 7 45 11 10 26 16 44 19" />
          <path d="M429 113c-7 10-3 20 8 27 8 5 18 8 30 8" />
        </g>
      </g>
      <path d="M454 111c15-18 27-30 41-34 8-2 13 3 10 9-2 5-8 7-12 4"
        fill="none" stroke="#abc9d2" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

import Image from 'next/image'

export function BrandLogo({
  compact = false,
  large = false,
  light = false,
  className = '',
}: {
  compact?: boolean
  /** Bigger lockup for the top-of-page header state */
  large?: boolean
  /** White wordmark for dark backgrounds */
  light?: boolean
  className?: string
}) {
  if (compact) {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/images/newlogo.png"
          alt="ScentBuild Studio"
          width={565}
          height={813}
          priority
          className="h-10 w-10 object-contain"
        />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/images/newlogo.png"
        alt=""
        width={565}
        height={813}
        priority
        className={`w-auto shrink-0 object-contain ${
          large ? 'h-16 sm:h-20' : 'h-11'
        }`}
      />
      <Image
        src={
          light
            ? '/images/new-logo-wordmark-light.png'
            : '/images/new-logo-wordmark.png'
        }
        alt="ScentBuild Studio"
        width={1805}
        height={583}
        priority
        className={`w-auto object-contain ${
          large ? 'h-10 sm:h-14' : 'h-7 sm:h-7 md:h-8'
        }`}
      />
    </div>
  )
}

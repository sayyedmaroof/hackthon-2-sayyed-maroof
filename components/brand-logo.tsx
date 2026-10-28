import Image from 'next/image'

export function BrandLogo({
  compact = false,
  light = false,
  className = '',
}: {
  compact?: boolean
  light?: boolean
  className?: string
}) {
  if (compact) {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/images/scentbuild-mark.png"
          alt="ScentBuild Studio mark"
          width={64}
          height={64}
          priority
          className="h-10 w-10 object-contain"
        />
      </div>
    )
  }

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={light ? '/images/scentbuild-wordmark-light.png' : '/images/scentbuild-wordmark.png'}
        alt="ScentBuild Studio logo"
        width={620}
        height={210}
        priority
        className="h-10 w-auto max-w-[260px] object-contain sm:h-12 md:h-[52px]"
      />
    </div>
  )
}

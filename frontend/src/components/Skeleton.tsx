type SkeletonProps = {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  width?: string;
  height?: string;
  lines?: number;
};

export default function Skeleton({
  className = '',
  variant = 'rect',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              width: i === lines - 1 ? '60%' : '100%',
              height: height ?? '14px',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div
        className={`skeleton rounded-full ${className}`}
        style={{
          width: width ?? '40px',
          height: height ?? width ?? '40px',
        }}
      />
    );
  }

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '20px',
      }}
    />
  );
}

/** Pre-built skeleton patterns */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <Skeleton variant="circle" width="32px" />
          <Skeleton variant="rect" width="40%" height="14px" />
          <Skeleton variant="rect" width="15%" height="14px" />
          <Skeleton variant="rect" width="15%" height="14px" />
          <Skeleton variant="circle" width="24px" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface-container-low border border-outline-variant/15 p-6 rounded-2xl space-y-4">
      <div className="flex justify-between">
        <Skeleton width="30%" height="12px" />
        <Skeleton width="20%" height="12px" />
      </div>
      <Skeleton variant="text" lines={4} />
    </div>
  );
}

export function StatusSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-6 w-full">
      <div className="col-span-8 bg-surface-container/40 border border-outline-variant/15 p-8 rounded-3xl space-y-6">
        <Skeleton width="40%" height="12px" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center pb-4 border-b border-outline-variant/10">
            <Skeleton width="35%" height="16px" />
            <Skeleton width="20%" height="28px" className="rounded-full" />
          </div>
        ))}
      </div>
      <div className="col-span-4">
        <div className="h-full bg-surface-container-high/60 border border-outline-variant/15 p-6 rounded-3xl flex flex-col justify-between gap-8">
          <Skeleton variant="circle" width="48px" />
          <div className="space-y-2">
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" height="12px" />
          </div>
        </div>
      </div>
    </div>
  );
}

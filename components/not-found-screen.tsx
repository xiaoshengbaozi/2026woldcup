import { Home, Radar, Search } from "lucide-react";
import styles from "./not-found-screen.module.css";

export function NotFoundScreen() {
  return (
    <main className={`${styles.root} relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16`}>
      <div className={`${styles.aura} pointer-events-none absolute inset-0`} />
      <div className={`${styles.splatters} pointer-events-none absolute inset-0 opacity-80 blur-[1px]`} />
      <div className={`${styles.sparks} pointer-events-none absolute inset-0 opacity-55`} />
      <div className={`${styles.scanlines} pointer-events-none absolute inset-0 opacity-25`} />
      <div className={`${styles.centerGlow} pointer-events-none absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 blur-3xl`} />

      <section className="relative z-10 w-full max-w-5xl">
        <div className="mx-auto max-w-3xl">
          <div className="relative px-2 py-8 sm:px-8 sm:py-12">
            <div className={`${styles.signal} mb-10 flex items-center justify-center gap-3`}>
              <span className={`${styles.signalIcon} flex h-10 w-10 items-center justify-center rounded-full`}>
                <Radar className="h-5 w-5" />
              </span>
              <span className="font-[ScreenMatrix] text-sm uppercase tracking-[0.42em]">route signal error</span>
            </div>

            <p className={`${styles.errorText} font-[ScreenMatrix] text-center text-4xl lowercase tracking-[0.28em] sm:text-5xl`}>
              error
            </p>
            <div className={`${styles.digit} mt-2 flex items-center justify-center font-[ScreenMatrix] text-[7.5rem] leading-none sm:text-[11rem] md:text-[13rem]`}>
              <span className={`${styles.ghostDigit} relative after:absolute after:left-1 after:top-2 after:content-['4']`}>4</span>
              <span className={`${styles.zero} mx-1 flex h-[0.72em] w-[0.72em] items-center justify-center rounded-full border-[0.08em] text-transparent`}>
                <span className={`${styles.slash} h-[0.08em] w-[0.78em] rotate-[-45deg] rounded-full`} />
              </span>
              <span className={`${styles.ghostDigit} relative after:absolute after:left-1 after:top-2 after:content-['4']`}>4</span>
            </div>

            <div className="mx-auto mt-8 max-w-xl text-center">
              <h1 className={`${styles.title} text-2xl font-semibold sm:text-3xl`}>
                {"\u8fd9\u6761\u8d5b\u573a\u901a\u9053\u6682\u65f6\u5931\u8054"}
              </h1>
              <p className={`${styles.copy} mt-4 text-base leading-7`}>
                {"\u4f60\u8981\u8bbf\u95ee\u7684\u9875\u9762\u6ca1\u6709\u8fdb\u5165\u6bd4\u8d5b\u540d\u5355\u3002\u53ef\u4ee5\u56de\u5230\u63a7\u5236\u53f0\uff0c\u6216\u91cd\u65b0\u641c\u7d22\u7403\u961f\u3001\u8d5b\u7a0b\u548c\u7403\u5458\u6570\u636e\u3002"}
              </p>
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/"
                className={`${styles.primaryLink} group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition`}
              >
                <Home className="h-4 w-4" />
                {"\u8fd4\u56de\u9996\u9875"}
              </a>
              <a
                href="/search"
                className={`${styles.secondaryLink} inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold backdrop-blur-2xl transition`}
              >
                <Search className="h-4 w-4" />
                {"\u641c\u7d22\u5185\u5bb9"}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

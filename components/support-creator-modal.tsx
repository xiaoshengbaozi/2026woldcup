"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Heart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SUPPORT_EVENT = "cyberball:open-support";

const supportMethods = {
  alipay: {
    label: "支付宝",
    hint: "支付宝扫一扫",
    image: "/support/alipay-qr.jpg",
    alt: "支付宝打赏二维码",
    accent: "text-sky-200",
  },
  wechat: {
    label: "微信",
    hint: "微信扫一扫",
    image: "/support/wechat-qr.jpg",
    alt: "微信打赏二维码",
    accent: "text-emerald-200",
  },
} as const;

type SupportMethod = keyof typeof supportMethods;

export function openCreatorSupportModal() {
  window.dispatchEvent(new Event(SUPPORT_EVENT));
  document.dispatchEvent(new Event(SUPPORT_EVENT));
}

export function SupportCreatorModal() {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<SupportMethod>("alipay");
  const modalRef = useRef<HTMLDivElement>(null);
  const active = supportMethods[method];

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener(SUPPORT_EVENT, handleOpen);
    document.addEventListener(SUPPORT_EVENT, handleOpen);
    return () => {
      window.removeEventListener(SUPPORT_EVENT, handleOpen);
      document.removeEventListener(SUPPORT_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (modalRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="打赏作者"
        title="打赏作者"
        onClick={() => setOpen(true)}
        className="support-floating-button fixed bottom-[6.25rem] right-4 z-[75] hidden h-14 w-14 place-items-center rounded-full bg-white/[0.08] text-rose-200 shadow-[0_18px_52px_rgba(0,0,0,.45),0_0_28px_rgba(255,94,148,.18),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 ring-white/15 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-rose-300/15 hover:text-white hover:shadow-[0_24px_64px_rgba(0,0,0,.5),0_0_40px_rgba(255,94,148,.25),inset_0_1px_0_rgba(255,255,255,.2)] sm:right-8 lg:bottom-8 lg:grid"
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-rose-300/10 blur-md" />
        <Heart className="relative h-6 w-6 fill-current" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="support-backdrop fixed inset-0 z-[10000] grid place-items-center overflow-hidden bg-black/68 px-4 py-8 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-label="打赏作者"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="support-modal relative w-full max-w-[390px] overflow-hidden rounded-[2rem] bg-[#05070b]/92 p-5 text-white shadow-[0_32px_120px_rgba(0,0,0,.75),0_0_74px_rgba(216,255,62,.13),inset_0_1px_0_rgba(255,255,255,.12)] ring-1 ring-white/[0.12] backdrop-blur-3xl"
            >
              <div className="support-glow-primary pointer-events-none absolute -left-24 top-10 h-44 w-44 rounded-full bg-volt/12 blur-[76px]" />
              <div className="support-glow-secondary pointer-events-none absolute -right-24 bottom-8 h-48 w-48 rounded-full bg-rose-400/12 blur-[82px]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="support-title text-2xl font-semibold tracking-normal text-white">为热爱续杯</h2>
                    <div className="support-badge inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-volt/85 ring-1 ring-white/[0.1]">
                      <Coffee className="h-4 w-4" />
                      Buy me a beer
                    </div>
                  </div>
                  <p className="support-copy mt-2 whitespace-nowrap text-[12px] leading-6 text-white/58">若这份赛程让你的观赛更从容，欢迎请作者喝一杯啤酒。</p>
                </div>
                <button
                  type="button"
                  aria-label="关闭打赏弹窗"
                  onClick={() => setOpen(false)}
                  className="support-close grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/58 ring-1 ring-white/[0.1] transition hover:text-white hover:ring-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="support-tabs relative mt-5 grid grid-cols-2 gap-2 rounded-full bg-white/[0.055] p-1 ring-1 ring-white/[0.08]">
                {(Object.keys(supportMethods) as SupportMethod[]).map((key) => {
                  const item = supportMethods[key];
                  const selected = key === method;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={`support-tab h-9 rounded-full text-xs font-semibold transition ${
                        selected
                          ? "support-tab-active bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.18),inset_0_1px_0_rgba(255,255,255,.24)] ring-1 ring-volt/35"
                          : "text-white/48 hover:text-white/78"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="support-qr-card relative mt-4 overflow-hidden rounded-[1.5rem] bg-white p-3 shadow-[0_20px_70px_rgba(0,0,0,.34)]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={method}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <Image
                      src={active.image}
                      alt={active.alt}
                      width={900}
                      height={1200}
                      className="h-auto w-full rounded-[1.05rem] object-contain"
                      priority={false}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="support-footer relative mt-4 flex items-center justify-between gap-3 rounded-[1.3rem] bg-white/[0.055] px-4 py-3 text-xs text-white/54 ring-1 ring-white/[0.08]">
                <span>{active.hint}</span>
                <span className={`support-footer-accent font-semibold ${active.accent}`}>感谢支持</span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

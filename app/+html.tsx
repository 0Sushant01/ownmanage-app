import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1"
        />
        <meta name="theme-color" content="#070b14" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <title>OwnManage</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; background: #070b14; }
              html { color-scheme: dark; }
              body {
                font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                -webkit-tap-highlight-color: transparent;
                text-rendering: optimizeLegibility;
                overscroll-behavior: none;
                font-feature-settings: "ss01" on, "cv11" on;
              }
              input, textarea, select { font-size: 16px !important; font-family: inherit !important; }
              button, [role="button"], a { cursor: pointer; touch-action: manipulation; }
              *:focus { outline: none; }
              *:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
              @media (hover: none) and (pointer: coarse) {
                button:active, [role="button"]:active, a:active { transform: scale(0.985); }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}

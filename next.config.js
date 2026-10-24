/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cross-origin isolation enables multi-threaded WebAssembly in the browser,
  // which makes the AI model run noticeably faster.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };

    // This library only runs in the browser, so keep it out of the server bundle
    if (isServer) {
      config.externals = [...(config.externals || []), "@imgly/background-removal"];
    }

    return config;
  },
};

module.exports = nextConfig;

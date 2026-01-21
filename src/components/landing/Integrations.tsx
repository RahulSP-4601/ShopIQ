"use client";

import React, { useId } from "react";

// Real SVG logos for each marketplace
const marketplaceLogos: Record<string, { logo: React.ReactNode; textColor: string }> = {
  // Global Marketplaces
  "Shopify": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 109 124" fill="#95BF47">
        <path d="M95.8 23.4c-.1-.6-.6-1-1.1-1-.5-.1-10.3-.8-10.3-.8s-6.8-6.7-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.1-6.2-5.9-11.8-12.6-11.8h-.6c-1.9-2.5-4.2-3.6-6.2-3.6-15.3 0-22.6 19.1-24.9 28.8-5.9 1.8-10.1 3.1-10.6 3.3-3.3 1-3.4 1.1-3.8 4.2-.3 2.3-9 69.3-9 69.3l67.5 12.7 36.5-7.9S95.9 24 95.8 23.4z"/>
      </svg>
    ),
    textColor: "text-[#95BF47]"
  },
  "Amazon": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FF9900" d="M29.4 17.5c-3.2 0-5.8.7-7.8 2.1-.5.3-.6.8-.3 1.2l1.4 2c.2.3.6.5 1 .5.2 0 .4-.1.6-.2 1.5-1 3.1-1.4 5-1.4 2.1 0 3.7.5 4.8 1.4.6.5 1 1.3 1 2.4v.7c-1.8-.3-3.4-.5-4.9-.5-2.8 0-5.1.6-6.8 1.8-1.8 1.3-2.7 3.2-2.7 5.6 0 2.2.7 3.9 2.1 5.2 1.4 1.2 3.2 1.8 5.5 1.8 2.8 0 5.1-1.1 6.9-3.4v2.4c0 .6.5 1.1 1.1 1.1h2.8c.6 0 1.1-.5 1.1-1.1V25.5c0-2.6-.8-4.6-2.3-6-1.6-1.4-3.9-2-6.5-2zm3.5 14.1c0 1.2-.5 2.3-1.4 3.2-.9.9-2.1 1.4-3.4 1.4-1 0-1.8-.3-2.3-.8-.5-.5-.8-1.2-.8-2.1 0-1 .4-1.9 1.1-2.5.8-.6 1.9-.9 3.4-.9 1.2 0 2.4.2 3.4.4v1.3z"/>
        <path fill="#FF9900" d="M44.3 35.6c-.3-.1-.6 0-.8.2-2.6 3-6.5 4.8-11.3 5.2-6.1.5-12.6-1.4-18.3-5.3-.2-.2-.5-.2-.8-.1-.2.1-.4.4-.4.7 0 .2.1.4.2.5 6.3 4.4 13.6 6.5 20.5 5.9 5.5-.5 10-2.6 13.1-6.1.2-.2.3-.5.2-.8-.1-.1-.2-.2-.4-.2z"/>
      </svg>
    ),
    textColor: "text-[#FF9900]"
  },
  "eBay": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#E53238" d="M8.2 22.8c0-2.9 1.7-5.2 5.1-5.2 3 0 4.7 1.8 4.7 4.8v.7H8.2v-.3z"/>
        <path fill="#0064D2" d="M20.8 25.9v-2.8c0-4.6-2.3-8.3-7.5-8.3-5 0-8 3.5-8 8.6 0 5.4 3.2 8.4 8.3 8.4 3.2 0 5.4-.9 6.7-2.1l-1.7-2.8c-1 .8-2.4 1.4-4.5 1.4-2.5 0-4.3-1.1-4.8-3.6h11.5v.2z"/>
        <path fill="#F5AF02" d="M22.1 31.4V10.3h3.4v8.1c1-2.1 3.2-3.6 6-3.6 4.5 0 7.3 3.5 7.3 8.4 0 5.1-3 8.6-7.5 8.6-2.7 0-4.8-1.4-5.9-3.5v3h-3.3z"/>
        <path fill="#86B817" d="M30.4 28.9c2.6 0 4.5-2.1 4.5-5.6 0-3.4-1.8-5.5-4.4-5.5-2.6 0-4.5 2.2-4.5 5.5 0 3.5 1.9 5.6 4.4 5.6z"/>
      </svg>
    ),
    textColor: "text-[#0064D2]"
  },
  "Etsy": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48" fill="#F1641E">
        <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm8.6 29.2c-.8.3-2.3.7-4.2.7-5.7 0-8.8-3.1-8.8-8.7V15.8h-3.4v-3.1h3.4V8.1l4.2-1.1v5.7h6.1l-.8 3.1h-5.3v8.6c0 3.8 1.5 5.7 4.8 5.7 1.3 0 2.7-.3 3.8-.7l.2 3.8z"/>
      </svg>
    ),
    textColor: "text-[#F1641E]"
  },
  "TikTok Shop": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#25F4EE" d="M34.1 10.3c-2.1-1.4-3.6-3.6-4.1-6.2h-6.5v27.5c0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5 2.5-5.5 5.5-5.5c.6 0 1.1.1 1.6.3v-6.6c-.5-.1-1.1-.1-1.6-.1-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12V19.1c2.5 1.8 5.5 2.8 8.7 2.8v-6.5c-1.8 0-3.4-.5-4.6-1.1z"/>
        <path fill="#FE2C55" d="M38.7 15.4v-6.5c-1.8 0-3.4-.5-4.6-1.1-2.1-1.4-3.6-3.6-4.1-6.2h-5v27.5c0 3-2.5 5.5-5.5 5.5-1.8 0-3.4-.9-4.4-2.2-2.4-1.5-3.1-4.3-1.6-6.8.9-1.5 2.4-2.5 4.1-2.8v-6.6c-6.6 0-12 5.4-12 12 0 3.8 1.8 7.2 4.6 9.4 2 1.7 4.6 2.6 7.4 2.6 6.6 0 12-5.4 12-12V19.1c2.5 1.8 5.5 2.8 8.7 2.8v-6.5h-.6z"/>
      </svg>
    ),
    textColor: "text-black"
  },
  "Walmart": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48" fill="#0071CE">
        <path d="M24 4l3.5 12h-7L24 4zm0 40l-3.5-12h7L24 44zm12.7-27.3l-10.2 6 3.5-11.5 6.7 5.5zm-25.4 0l6.7-5.5 3.5 11.5-10.2-6zm25.4 14.6l-6.7 5.5-3.5-11.5 10.2 6zm-25.4 0l10.2-6-3.5 11.5-6.7-5.5z"/>
      </svg>
    ),
    textColor: "text-[#0071CE]"
  },

  // India Marketplaces
  "Flipkart": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#2874F0" width="48" height="48" rx="8"/>
        <path fill="#F8E71C" d="M14 12h6l-2 8h6l-10 16 2-10h-5l3-14z"/>
      </svg>
    ),
    textColor: "text-[#2874F0]"
  },
  "Amazon India": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FF9900" d="M29.4 17.5c-3.2 0-5.8.7-7.8 2.1-.5.3-.6.8-.3 1.2l1.4 2c.2.3.6.5 1 .5.2 0 .4-.1.6-.2 1.5-1 3.1-1.4 5-1.4 2.1 0 3.7.5 4.8 1.4.6.5 1 1.3 1 2.4v.7c-1.8-.3-3.4-.5-4.9-.5-2.8 0-5.1.6-6.8 1.8-1.8 1.3-2.7 3.2-2.7 5.6 0 2.2.7 3.9 2.1 5.2 1.4 1.2 3.2 1.8 5.5 1.8 2.8 0 5.1-1.1 6.9-3.4v2.4c0 .6.5 1.1 1.1 1.1h2.8c.6 0 1.1-.5 1.1-1.1V25.5c0-2.6-.8-4.6-2.3-6-1.6-1.4-3.9-2-6.5-2zm3.5 14.1c0 1.2-.5 2.3-1.4 3.2-.9.9-2.1 1.4-3.4 1.4-1 0-1.8-.3-2.3-.8-.5-.5-.8-1.2-.8-2.1 0-1 .4-1.9 1.1-2.5.8-.6 1.9-.9 3.4-.9 1.2 0 2.4.2 3.4.4v1.3z"/>
        <path fill="#FF9900" d="M44.3 35.6c-.3-.1-.6 0-.8.2-2.6 3-6.5 4.8-11.3 5.2-6.1.5-12.6-1.4-18.3-5.3-.2-.2-.5-.2-.8-.1-.2.1-.4.4-.4.7 0 .2.1.4.2.5 6.3 4.4 13.6 6.5 20.5 5.9 5.5-.5 10-2.6 13.1-6.1.2-.2.3-.5.2-.8-.1-.1-.2-.2-.4-.2z"/>
      </svg>
    ),
    textColor: "text-[#FF9900]"
  },
  "Meesho": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#F43397" width="48" height="48" rx="8"/>
        <path fill="white" d="M12 32V16l8 8-8 8zm8-8l8-8v16l-8-8zm8 0l8-8v16l-8-8z"/>
      </svg>
    ),
    textColor: "text-[#F43397]"
  },
  "Myntra": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FF3F6C" width="48" height="48" rx="8"/>
        <path fill="white" d="M14 34V14l10 10 10-10v20l-10-10-10 10z"/>
      </svg>
    ),
    textColor: "text-[#FF3F6C]"
  },
  "JioMart": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#0078AD" width="48" height="48" rx="8"/>
        <circle fill="white" cx="24" cy="24" r="12"/>
        <circle fill="#0078AD" cx="24" cy="24" r="6"/>
      </svg>
    ),
    textColor: "text-[#0078AD]"
  },
  "Snapdeal": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#E40046" width="48" height="48" rx="8"/>
        <path fill="white" d="M24 10l14 14-14 14-14-14 14-14z"/>
      </svg>
    ),
    textColor: "text-[#E40046]"
  },

  // Fashion & Lifestyle
  "Nykaa": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FC2779" width="48" height="48" rx="8"/>
        <path fill="white" d="M16 14v20l8-10 8 10V14l-8 10-8-10z"/>
      </svg>
    ),
    textColor: "text-[#FC2779]"
  },
  "Nykaa Fashion": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FC2779" width="48" height="48" rx="8"/>
        <path fill="white" d="M16 14v20l8-10 8 10V14l-8 10-8-10z"/>
      </svg>
    ),
    textColor: "text-[#FC2779]"
  },
  "AJIO": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#323232" width="48" height="48" rx="8"/>
        <text x="8" y="32" fill="#F7D046" fontSize="18" fontWeight="bold">A</text>
      </svg>
    ),
    textColor: "text-[#323232]"
  },
  "Tata CLiQ": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#722257" width="48" height="48" rx="8"/>
        <circle fill="white" cx="24" cy="24" r="10"/>
        <circle fill="#722257" cx="24" cy="24" r="5"/>
      </svg>
    ),
    textColor: "text-[#722257]"
  },
  "Limeroad": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FE006E" width="48" height="48" rx="8"/>
        <path fill="white" d="M18 12v24h4V12h-4zm8 8v16h4V20h-4z"/>
      </svg>
    ),
    textColor: "text-[#FE006E]"
  },
  "Bewakoof": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FFC801" width="48" height="48" rx="8"/>
        <path fill="#333" d="M16 16h16v4H20v4h10v4H20v4h12v4H16V16z"/>
      </svg>
    ),
    textColor: "text-[#333333]"
  },

  // Social Commerce
  "Instagram Shopping": {
    logo: null, // Will be rendered with unique ID in component
    textColor: "text-[#E1306C]"
  },
  "Facebook Marketplace": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48" fill="#1877F2">
        <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm2.5 22h-3.5v11h-5V26h-2v-4h2v-2.5c0-3.4 1.4-5.5 5.5-5.5h3.5v4h-2.2c-1.6 0-1.8.6-1.8 1.8V22h4l-.5 4z"/>
      </svg>
    ),
    textColor: "text-[#1877F2]"
  },
  "WhatsApp Business": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48" fill="#25D366">
        <path d="M24 4C12.95 4 4 12.95 4 24c0 3.86 1.1 7.46 3 10.5L4 44l9.8-3c2.9 1.7 6.2 2.7 9.8 2.7h.4c11.05 0 20-8.95 20-20S35.05 4 24 4zm11 28.7c-.5 1.3-2.4 2.4-3.8 2.7-1.4.3-3.2.4-10.3-2.2C13 30.4 8.7 22.2 8.4 21.8c-.3-.4-2.4-3.2-2.4-6.1 0-2.9 1.5-4.3 2.1-4.9.5-.5 1.1-.7 1.5-.7h1.1c.4 0 .9 0 1.3.9.5 1.2 1.6 4 1.7 4.3.1.3.2.6 0 .9-.1.3-.2.5-.4.7-.2.3-.4.6-.6.8-.2.3-.5.5-.2 1 .3.5 1.3 2.2 2.9 3.5 2 1.7 3.7 2.2 4.2 2.5.5.2.8.2 1.1-.1.3-.4 1.3-1.5 1.6-2 .3-.5.7-.4 1.1-.3.5.2 3 1.4 3.5 1.7.5.3.9.4 1 .7.2.3.2 1.5-.3 2.8z"/>
      </svg>
    ),
    textColor: "text-[#25D366]"
  },
  "Shopsy": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#6C3BF5" width="48" height="48" rx="8"/>
        <path fill="white" d="M14 18h20l-2 14H16l-2-14zm4-6h12v4H18v-4z"/>
      </svg>
    ),
    textColor: "text-[#6C3BF5]"
  },
  "Pinterest": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48" fill="#E60023">
        <path d="M24 4C12.95 4 4 12.95 4 24c0 8.05 4.77 14.98 11.64 18.14-.16-1.44-.3-3.66.06-5.24.33-1.42 2.13-9.04 2.13-9.04s-.54-1.09-.54-2.7c0-2.53 1.47-4.42 3.3-4.42 1.55 0 2.3 1.17 2.3 2.57 0 1.56-1 3.9-1.51 6.07-.43 1.81.91 3.29 2.69 3.29 3.23 0 5.72-3.41 5.72-8.33 0-4.35-3.13-7.4-7.6-7.4-5.18 0-8.22 3.88-8.22 7.9 0 1.56.6 3.24 1.35 4.15.15.18.17.34.13.52-.14.56-.44 1.79-.5 2.04-.08.33-.27.4-.62.24-2.33-1.08-3.78-4.49-3.78-7.23 0-5.88 4.27-11.28 12.32-11.28 6.47 0 11.5 4.61 11.5 10.77 0 6.43-4.05 11.6-9.68 11.6-1.89 0-3.67-.98-4.28-2.14 0 0-.94 3.56-1.16 4.44-.42 1.62-1.56 3.65-2.32 4.88C20.28 43.67 22.1 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4z"/>
      </svg>
    ),
    textColor: "text-[#E60023]"
  },
  "YouTube Shopping": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FF0000" d="M44.5 13.5s-.4-3-1.7-4.3c-1.6-1.7-3.4-1.7-4.2-1.8C32.7 7 24 7 24 7s-8.7 0-14.6.4c-.8.1-2.6.1-4.2 1.8-1.3 1.3-1.7 4.3-1.7 4.3S3 17.1 3 20.6v3.3c0 3.5.5 7.1.5 7.1s.4 3 1.7 4.3c1.6 1.7 3.7 1.6 4.6 1.8 3.4.3 14.2.4 14.2.4s8.7 0 14.6-.5c.8-.1 2.6-.1 4.2-1.8 1.3-1.3 1.7-4.3 1.7-4.3s.5-3.6.5-7.1v-3.3c0-3.5-.5-7.1-.5-7.1z"/>
        <path fill="white" d="M19 30V17l11 6.5L19 30z"/>
      </svg>
    ),
    textColor: "text-[#FF0000]"
  },

  // Specialty Platforms
  "FirstCry": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#F47820" width="48" height="48" rx="8"/>
        <circle fill="white" cx="24" cy="18" r="8"/>
        <path fill="white" d="M16 28h16v10c0 2-3.5 4-8 4s-8-2-8-4V28z"/>
      </svg>
    ),
    textColor: "text-[#F47820]"
  },
  "Pepperfry": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#F16722" width="48" height="48" rx="8"/>
        <path fill="white" d="M14 34V14h6v8h8v-8h6v20h-6v-8h-8v8h-6z"/>
      </svg>
    ),
    textColor: "text-[#F16722]"
  },
  "Urban Ladder": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FA6400" width="48" height="48" rx="8"/>
        <path fill="white" d="M16 10v28h4V10h-4zm12 0v28h4V10h-4zm-10 8h12v4H18v-4zm0 10h12v4H18v-4z"/>
      </svg>
    ),
    textColor: "text-[#FA6400]"
  },
  "Croma": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#0DB14B" width="48" height="48" rx="8"/>
        <circle fill="white" cx="24" cy="24" r="12"/>
        <path fill="#0DB14B" d="M20 20h8v8h-8z"/>
      </svg>
    ),
    textColor: "text-[#0DB14B]"
  },
  "1mg": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FF6F61" width="48" height="48" rx="8"/>
        <path fill="white" d="M14 16h4v16h-4V16zm8 0h8l-4 8 4 8h-8l4-8-4-8z"/>
      </svg>
    ),
    textColor: "text-[#FF6F61]"
  },
  "BigBasket": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#84C225" width="48" height="48" rx="8"/>
        <path fill="white" d="M14 18h20l-2 16H16l-2-16zm6-6h8v4h-8v-4z"/>
        <circle fill="white" cx="18" cy="38" r="3"/>
        <circle fill="white" cx="30" cy="38" r="3"/>
      </svg>
    ),
    textColor: "text-[#84C225]"
  },

  // B2B Platforms
  "IndiaMART": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#3A78F2" width="48" height="48" rx="8"/>
        <text x="10" y="32" fill="white" fontSize="16" fontWeight="bold">iM</text>
      </svg>
    ),
    textColor: "text-[#3A78F2]"
  },
  "Udaan": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#7B61FF" width="48" height="48" rx="8"/>
        <path fill="white" d="M12 28c0-8 5.4-14 12-14s12 6 12 14H12zm8-4h8v2h-8v-2z"/>
      </svg>
    ),
    textColor: "text-[#7B61FF]"
  },
  "Amazon Business": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FF9900" d="M29.4 17.5c-3.2 0-5.8.7-7.8 2.1-.5.3-.6.8-.3 1.2l1.4 2c.2.3.6.5 1 .5.2 0 .4-.1.6-.2 1.5-1 3.1-1.4 5-1.4 2.1 0 3.7.5 4.8 1.4.6.5 1 1.3 1 2.4v.7c-1.8-.3-3.4-.5-4.9-.5-2.8 0-5.1.6-6.8 1.8-1.8 1.3-2.7 3.2-2.7 5.6 0 2.2.7 3.9 2.1 5.2 1.4 1.2 3.2 1.8 5.5 1.8 2.8 0 5.1-1.1 6.9-3.4v2.4c0 .6.5 1.1 1.1 1.1h2.8c.6 0 1.1-.5 1.1-1.1V25.5c0-2.6-.8-4.6-2.3-6-1.6-1.4-3.9-2-6.5-2zm3.5 14.1c0 1.2-.5 2.3-1.4 3.2-.9.9-2.1 1.4-3.4 1.4-1 0-1.8-.3-2.3-.8-.5-.5-.8-1.2-.8-2.1 0-1 .4-1.9 1.1-2.5.8-.6 1.9-.9 3.4-.9 1.2 0 2.4.2 3.4.4v1.3z"/>
        <path fill="#FF9900" d="M44.3 35.6c-.3-.1-.6 0-.8.2-2.6 3-6.5 4.8-11.3 5.2-6.1.5-12.6-1.4-18.3-5.3-.2-.2-.5-.2-.8-.1-.2.1-.4.4-.4.7 0 .2.1.4.2.5 6.3 4.4 13.6 6.5 20.5 5.9 5.5-.5 10-2.6 13.1-6.1.2-.2.3-.5.2-.8-.1-.1-.2-.2-.4-.2z"/>
      </svg>
    ),
    textColor: "text-[#FF9900]"
  },
  "Alibaba": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#FF6A00" width="48" height="48" rx="8"/>
        <text x="10" y="32" fill="white" fontSize="16" fontWeight="bold">ali</text>
      </svg>
    ),
    textColor: "text-[#FF6A00]"
  },
  "TradeIndia": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#F15A29" width="48" height="48" rx="8"/>
        <text x="12" y="32" fill="white" fontSize="16" fontWeight="bold">Ti</text>
      </svg>
    ),
    textColor: "text-[#F15A29]"
  },
  "ExportersIndia": {
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <rect fill="#003366" width="48" height="48" rx="8"/>
        <text x="12" y="32" fill="white" fontSize="16" fontWeight="bold">Ei</text>
      </svg>
    ),
    textColor: "text-[#003366]"
  },
};

const integrationCategories = [
  {
    title: "Global Marketplaces",
    description: "Connect with the world's largest e-commerce platforms",
    integrations: [
      { name: "Shopify", status: "live", region: "Global" },
      { name: "Amazon", status: "live", region: "Global" },
      { name: "eBay", status: "live", region: "Global" },
      { name: "Etsy", status: "live", region: "Global" },
      { name: "TikTok Shop", status: "live", region: "Global" },
      { name: "Walmart", status: "coming", region: "US" },
    ],
  },
  {
    title: "India Marketplaces",
    description: "Dominate the Indian e-commerce market",
    integrations: [
      { name: "Flipkart", status: "live", region: "India" },
      { name: "Amazon India", status: "live", region: "India" },
      { name: "Meesho", status: "live", region: "India" },
      { name: "Myntra", status: "live", region: "India" },
      { name: "JioMart", status: "coming", region: "India" },
      { name: "Snapdeal", status: "coming", region: "India" },
    ],
  },
  {
    title: "Fashion & Lifestyle",
    description: "Fashion-focused platforms for style brands",
    integrations: [
      { name: "Nykaa", status: "coming", region: "India" },
      { name: "Nykaa Fashion", status: "coming", region: "India" },
      { name: "AJIO", status: "coming", region: "India" },
      { name: "Tata CLiQ", status: "coming", region: "India" },
      { name: "Limeroad", status: "coming", region: "India" },
      { name: "Bewakoof", status: "coming", region: "India" },
    ],
  },
  {
    title: "Social Commerce",
    description: "Sell where your customers spend time",
    integrations: [
      { name: "Instagram Shopping", status: "coming", region: "Global" },
      { name: "Facebook Marketplace", status: "coming", region: "Global" },
      { name: "WhatsApp Business", status: "coming", region: "Global" },
      { name: "Shopsy", status: "coming", region: "India" },
      { name: "Pinterest", status: "coming", region: "Global" },
      { name: "YouTube Shopping", status: "coming", region: "Global" },
    ],
  },
  {
    title: "Specialty Platforms",
    description: "Niche marketplaces for specific categories",
    integrations: [
      { name: "FirstCry", status: "coming", region: "India" },
      { name: "Pepperfry", status: "coming", region: "India" },
      { name: "Urban Ladder", status: "coming", region: "India" },
      { name: "Croma", status: "coming", region: "India" },
      { name: "1mg", status: "coming", region: "India" },
      { name: "BigBasket", status: "coming", region: "India" },
    ],
  },
  {
    title: "B2B Platforms",
    description: "Wholesale and business marketplaces",
    integrations: [
      { name: "IndiaMART", status: "coming", region: "India" },
      { name: "Udaan", status: "coming", region: "India" },
      { name: "Amazon Business", status: "coming", region: "Global" },
      { name: "Alibaba", status: "coming", region: "Global" },
      { name: "TradeIndia", status: "coming", region: "India" },
      { name: "ExportersIndia", status: "coming", region: "India" },
    ],
  },
];

export function Integrations() {
  return (
    <section id="integrations" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-sm font-medium text-cyan-700 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            50+ Integrations
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
            Connect <span className="text-cyan-600">Every Marketplace</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            One-click OAuth integration with all major e-commerce platforms.
            No complex API setup required.
          </p>
        </div>

        {/* Integration grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {integrationCategories.map((category, index) => (
            <IntegrationCard key={index} category={category} index={index} />
          ))}
        </div>

        {/* Coming soon note */}
        <div className="fade-up mt-12 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">Need a specific marketplace?</p>
              <p className="text-sm text-slate-600">We add new integrations weekly. Request yours and we&apos;ll prioritize it.</p>
            </div>
            <a
              href="/contact"
              className="ml-4 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Request
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationCard({
  category,
  index,
}: {
  category: (typeof integrationCategories)[0];
  index: number;
}) {
  return (
    <div
      className="fade-up group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:border-slate-300"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        {category.title}
      </h3>
      <p className="text-sm text-slate-500 mb-5">
        {category.description}
      </p>

      <div className="space-y-3">
        {category.integrations.map((integration, i) => (
          <IntegrationItem key={i} integration={integration} />
        ))}
      </div>
    </div>
  );
}

// Instagram logo component with unique gradient ID
function InstagramLogo() {
  const gradientId = useId();
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80"/>
          <stop offset="25%" stopColor="#F77737"/>
          <stop offset="50%" stopColor="#FD1D1D"/>
          <stop offset="75%" stopColor="#C13584"/>
          <stop offset="100%" stopColor="#833AB4"/>
        </linearGradient>
      </defs>
      <rect fill={`url(#${gradientId})`} width="48" height="48" rx="12"/>
      <rect x="12" y="12" width="24" height="24" rx="6" fill="none" stroke="white" strokeWidth="3"/>
      <circle cx="24" cy="24" r="6" fill="none" stroke="white" strokeWidth="3"/>
      <circle cx="32" cy="16" r="2" fill="white"/>
    </svg>
  );
}

// Individual integration item component
function IntegrationItem({ integration }: { integration: { name: string; status: string; region: string } }) {
  const logoData = marketplaceLogos[integration.name];

  // Determine which logo to render
  const renderLogo = () => {
    if (integration.name === "Instagram Shopping") {
      return <InstagramLogo />;
    }
    if (logoData?.logo) {
      return logoData.logo;
    }
    return (
      <div className="w-full h-full bg-indigo-100 flex items-center justify-center rounded-lg">
        <span className="text-xs font-bold text-indigo-600">{integration.name.charAt(0)}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 transition-colors hover:bg-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
          {renderLogo()}
        </div>
        <span className={`text-sm font-medium ${logoData?.textColor || "text-slate-700"}`}>
          {integration.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{integration.region}</span>
        {integration.status === "live" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
            Soon
          </span>
        )}
      </div>
    </div>
  );
}

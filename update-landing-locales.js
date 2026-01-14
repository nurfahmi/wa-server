import fs from 'fs';

const enPath = '/Users/indosofthouse/PROJECT 2026/baileys/client/src/locales/en.js';
const idPath = '/Users/indosofthouse/PROJECT 2026/baileys/client/src/locales/id.js';

const landingEn = {
  heroTitle: 'Reply Faster,',
  heroSubtitle: 'Sell More.',
  heroDesc: 'Turn your WhatsApp into a 24/7 sales machine. AI handles customer inquiries, your team focuses on closing deals.',
  ctaStart: 'Start Now',
  uspSecure: 'Secure Connections',
  uspSupport: '24/7 Support',
  uspGlobal: 'Global Reach',
  featuresTitle: 'Everything You Need to',
  featuresSubtitle: 'Scale Your Business',
  featuresDesc: 'Powerful features designed to help you handle more customers with less effort.',
  howItWorks: 'Get Started in',
  steps: 'Simple Steps',
  pricingTitle: 'Simple,',
  pricingSubtitle: 'Transparent Pricing',
  pricingDesc: 'Premium features for high-growth businesses.',
  loadingPlans: 'Loading optimal plans...',
  footerRights: 'All rights reserved.'
};

const landingId = {
  heroTitle: 'Balas Chat,',
  heroSubtitle: 'Lebih Cepat.',
  heroDesc: 'Ubah WhatsApp kamu jadi mesin penjualan 24/7. AI tangani pertanyaan customer, tim kamu fokus closing deals.',
  ctaStart: 'Coba Sekarang',
  uspSecure: 'Koneksi Aman',
  uspSupport: 'Support 24/7',
  uspGlobal: 'Jangkauan Global',
  featuresTitle: 'Semua yang Kamu Butuhkan untuk',
  featuresSubtitle: 'Kembangkan Bisnis',
  featuresDesc: 'Fitur powerful yang dirancang untuk bantu kamu handle lebih banyak customer dengan lebih sedikit effort.',
  howItWorks: 'Mulai dalam',
  steps: 'Langkah Mudah',
  pricingTitle: 'Harga',
  pricingSubtitle: 'Transparan',
  pricingDesc: 'Fitur premium untuk bisnis yang sedang berkembang pesat.',
  loadingPlans: 'Memuat paket terbaik...',
  footerRights: 'Hak cipta dilindungi.'
};

function updateLocale(path, landingData) {
  let content = fs.readFileSync(path, 'utf8');
  const sectionName = 'landing';
  
  if (!content.includes(`${sectionName}:`)) {
    // Find the end of the object
    const lastBraceIndex = content.lastIndexOf('};');
    const newContent = content.substring(0, lastBraceIndex) + 
      `  ${sectionName}: ${JSON.stringify(landingData, null, 2).replace(/"([^"]+)":/g, '$1:')},\n` + 
      content.substring(lastBraceIndex);
    fs.writeFileSync(path, newContent);
  } else {
     // replace existing section - very naive regex
     const startMarker = `${sectionName}: {`;
     const startIndex = content.indexOf(startMarker);
     let openBraces = 0;
     let endIndex = -1;
     
     for (let i = startIndex + sectionName.length + 2; i < content.length; i++) {
       if (content[i] === '{') openBraces++;
       if (content[i] === '}') {
         if (openBraces === 0) {
           endIndex = i + 1;
           break;
         }
         openBraces--;
       }
     }
     
     if (startIndex !== -1 && endIndex !== -1) {
       const newContent = content.substring(0, startIndex) + 
         `${sectionName}: ${JSON.stringify(landingData, null, 2).replace(/"([^"]+)":/g, '$1:')}` + 
         content.substring(endIndex);
       fs.writeFileSync(path, newContent);
     }
  }
}

updateLocale(enPath, landingEn);
updateLocale(idPath, landingId);
console.log('Locales successfully updated!');

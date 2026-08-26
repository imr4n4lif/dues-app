/**
 * Complete set of actively circulating ISO 4217 fiat currencies.
 *
 * Maintenance notes:
 * - Codes follow ISO 4217; codes are the ONLY identifier used anywhere in the app.
 * - `decimalDigits` follows the ISO minor-unit convention (0, 2 or 3).
 * - Special-purpose funds/metals/codes (XAU, XDR, BOV, CHW, …) are intentionally
 *   excluded — only real circulating national/supranational currencies are listed.
 * - Historical replacements already applied: XCG replaced ANG (2025),
 *   ZWG replaced ZWL (2024), VED/VES both remain in circulation per ISO.
 */

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string | null;
  decimalDigits: number;
}

export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalDigits: 2 },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', decimalDigits: 2 },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L', decimalDigits: 2 },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', decimalDigits: 2 },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', decimalDigits: 2 },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalDigits: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalDigits: 2 },
  { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ', decimalDigits: 2 },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', decimalDigits: 2 },
  { code: 'BAM', name: 'Bosnia & Herzegovina Convertible Mark', symbol: 'KM', decimalDigits: 2 },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', decimalDigits: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimalDigits: 2 },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', decimalDigits: 3 },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu', decimalDigits: 0 },
  { code: 'BMD', name: 'Bermudian Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'BND', name: 'Brunei Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.', decimalDigits: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalDigits: 2 },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu.', decimalDigits: 2 },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', decimalDigits: 2 },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', decimalDigits: 2 },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$', decimalDigits: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimalDigits: 2 },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', decimalDigits: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalDigits: 2 },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', decimalDigits: 0 },
  { code: 'CNY', name: 'Chinese Yuan Renminbi', symbol: '¥', decimalDigits: 2 },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', decimalDigits: 2 },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', decimalDigits: 2 },
  { code: 'CUP', name: 'Cuban Peso', symbol: '$', decimalDigits: 2 },
  { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$', decimalDigits: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimalDigits: 2 },
  { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj', decimalDigits: 0 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimalDigits: 2 },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', decimalDigits: 2 },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', decimalDigits: 2 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', decimalDigits: 2 },
  { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk', decimalDigits: 2 },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', decimalDigits: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalDigits: 2 },
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', decimalDigits: 2 },
  { code: 'FKP', name: 'Falkland Islands Pound', symbol: '£', decimalDigits: 2 },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', decimalDigits: 2 },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', decimalDigits: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', decimalDigits: 2 },
  { code: 'GIP', name: 'Gibraltar Pound', symbol: '£', decimalDigits: 2 },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', decimalDigits: 2 },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'FG', decimalDigits: 0 },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', decimalDigits: 2 },
  { code: 'GYD', name: 'Guyanese Dollar', symbol: 'G$', decimalDigits: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalDigits: 2 },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L', decimalDigits: 2 },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G', decimalDigits: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalDigits: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalDigits: 2 },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', decimalDigits: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalDigits: 2 },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', decimalDigits: 3 },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', decimalDigits: 2 },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimalDigits: 0 },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', decimalDigits: 2 },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', decimalDigits: 3 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalDigits: 0 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimalDigits: 2 },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'с', decimalDigits: 2 },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', decimalDigits: 2 },
  { code: 'KMF', name: 'Comorian Franc', symbol: 'CF', decimalDigits: 0 },
  { code: 'KPW', name: 'North Korean Won', symbol: '₩', decimalDigits: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimalDigits: 0 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', decimalDigits: 3 },
  { code: 'KYD', name: 'Cayman Islands Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', decimalDigits: 2 },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭', decimalDigits: 2 },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', decimalDigits: 2 },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', decimalDigits: 2 },
  { code: 'LRD', name: 'Liberian Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L', decimalDigits: 2 },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د', decimalDigits: 3 },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', decimalDigits: 2 },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', decimalDigits: 2 },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar', decimalDigits: 2 },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден', decimalDigits: 2 },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', decimalDigits: 2 },
  { code: 'MNT', name: 'Mongolian Tögrög', symbol: '₮', decimalDigits: 2 },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$', decimalDigits: 2 },
  { code: 'MRU', name: 'Mauritanian Ouguiya', symbol: 'UM', decimalDigits: 2 },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', decimalDigits: 2 },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: '.ރ', decimalDigits: 2 },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK', decimalDigits: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', decimalDigits: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalDigits: 2 },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', decimalDigits: 2 },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$', decimalDigits: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimalDigits: 2 },
  { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$', decimalDigits: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalDigits: 2 },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू', decimalDigits: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalDigits: 2 },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', decimalDigits: 3 },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', decimalDigits: 2 },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', decimalDigits: 2 },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K', decimalDigits: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalDigits: 2 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', decimalDigits: 2 },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimalDigits: 2 },
  { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲', decimalDigits: 0 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', decimalDigits: 2 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalDigits: 2 },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин.', decimalDigits: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimalDigits: 2 },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw', decimalDigits: 0 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', decimalDigits: 2 },
  { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$', decimalDigits: 2 },
  { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨', decimalDigits: 2 },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.', decimalDigits: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalDigits: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalDigits: 2 },
  { code: 'SHP', name: 'Saint Helena Pound', symbol: '£', decimalDigits: 2 },
  { code: 'SLE', name: 'Sierra Leonean Leone', symbol: 'Le', decimalDigits: 2 },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh', decimalDigits: 2 },
  { code: 'SRD', name: 'Surinamese Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: '£', decimalDigits: 2 },
  { code: 'STN', name: 'São Tomé & Príncipe Dobra', symbol: 'Db', decimalDigits: 2 },
  { code: 'SVC', name: 'Salvadoran Colón', symbol: '₡', decimalDigits: 2 },
  { code: 'SYP', name: 'Syrian Pound', symbol: '£S', decimalDigits: 2 },
  { code: 'SZL', name: 'Eswatini Lilangeni', symbol: 'E', decimalDigits: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalDigits: 2 },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'ЅМ', decimalDigits: 2 },
  { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'm', decimalDigits: 2 },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', decimalDigits: 3 },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', decimalDigits: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalDigits: 2 },
  { code: 'TTD', name: 'Trinidad & Tobago Dollar', symbol: 'TT$', decimalDigits: 2 },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', decimalDigits: 2 },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', decimalDigits: 2 },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimalDigits: 2 },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', decimalDigits: 0 },
  { code: 'USD', name: 'United States Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', decimalDigits: 2 },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: "so'm", decimalDigits: 2 },
  { code: 'VED', name: 'Venezuelan Bolívar Soberano', symbol: 'Bs.D', decimalDigits: 2 },
  { code: 'VES', name: 'Venezuelan Bolívar Soberano (legacy)', symbol: 'Bs.', decimalDigits: 2 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimalDigits: 0 },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT', decimalDigits: 0 },
  { code: 'WST', name: 'Samoan Tala', symbol: 'WS$', decimalDigits: 2 },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', decimalDigits: 0 },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$', decimalDigits: 2 },
  { code: 'XCG', name: 'Caribbean Guilder', symbol: 'Cg', decimalDigits: 2 },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', decimalDigits: 0 },
  { code: 'XPF', name: 'CFP Franc', symbol: '₣', decimalDigits: 0 },
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼', decimalDigits: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalDigits: 2 },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', decimalDigits: 2 },
  { code: 'ZWG', name: 'Zimbabwe Gold', symbol: 'ZiG', decimalDigits: 2 },
];

const FALLBACK_CURRENCY: CurrencyInfo = {
  code: 'XXX',
  name: 'Unknown Currency',
  symbol: null,
  decimalDigits: 2,
};

const BY_CODE = new Map<string, CurrencyInfo>(CURRENCIES.map((c) => [c.code, c]));

/** Symbols shared by more than one active currency — ambiguous when displayed alone. */
const SHARED_SYMBOLS = new Set<string>(
  (() => {
    const counts = new Map<string, number>();
    for (const c of CURRENCIES) {
      if (!c.symbol) continue;
      const key = c.symbol.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s);
  })()
);

export function getCurrency(code: string): CurrencyInfo {
  return BY_CODE.get(code.toUpperCase()) ?? { ...FALLBACK_CURRENCY };
}

export function isKnownCurrency(code: string): boolean {
  return BY_CODE.has(code.toUpperCase());
}

export function getDecimalDigits(code: string): number {
  return getCurrency(code).decimalDigits;
}

/** True when the symbol alone would be ambiguous (e.g. plain "$"). */
export function isSymbolAmbiguous(code: string): boolean {
  const info = getCurrency(code);
  if (!info.symbol) return true;
  return SHARED_SYMBOLS.has(info.symbol.toLowerCase());
}

export interface CurrencySearchResult extends CurrencyInfo {
  /** True for a small curated quick-pick set shown at the top of pickers. */
  popular: boolean;
}

export const POPULAR_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'JPY'] as const;

const POPULAR_SET = new Set<string>(POPULAR_CURRENCY_CODES);

export function searchCurrencies(query: string): CurrencySearchResult[] {
  const q = query.trim().toLowerCase();
  const results = CURRENCIES.filter((c) => {
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
  });
  return results
    .map((c) => ({ ...c, popular: POPULAR_SET.has(c.code) }))
    .sort((a, b) => {
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return a.code.localeCompare(b.code);
    });
}

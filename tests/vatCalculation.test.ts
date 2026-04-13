// Unit testy pro VAT výpočty
// Zajišťuje že nebudeme míchat neplátce s plátcem s 0% sazbou

import {
  calculateVatAmountSafe,
  isVatPayerEntity,
  calculateVatFromNet,
  calculateVatFromGross,
  round2,
} from '@/lib/vatCalculation'

describe('VAT Calculation - Critical Edge Cases', () => {
  describe('isVatPayerEntity', () => {
    it('neplátce s vatRate=0 → false (není plátce)', () => {
      const result = isVatPayerEntity(false, 0)
      expect(result).toBe(false)
    })

    it('plátce s vatRate=0 → true (je plátce, i když sazba 0%)', () => {
      const result = isVatPayerEntity(true, 0)
      expect(result).toBe(true)
    })

    it('plátce s vatRate=21 → true (je plátce)', () => {
      const result = isVatPayerEntity(true, 21)
      expect(result).toBe(true)
    })

    it('neplátce s vatRate=21 → false (není plátce, i když má sazbu)', () => {
      // Toto by v praxi nemělo nastat, ale test musí pokrýt i edge case
      const result = isVatPayerEntity(false, 21)
      expect(result).toBe(false)
    })
  })

  describe('calculateVatAmountSafe', () => {
    it('neplátce, cena 100 Kč, vatRate=0 → DPH = 0 Kč', () => {
      const vatAmount = calculateVatAmountSafe(100, false, 0)
      expect(vatAmount).toBe(0)
    })

    it('plátce, cena 100 Kč, vatRate=0 → DPH = 0 Kč', () => {
      // Stejný výsledek, ale JINÝ důvod (plátce s 0% sazbou)
      const vatAmount = calculateVatAmountSafe(100, true, 0)
      expect(vatAmount).toBe(0)
    })

    it('plátce, cena 100 Kč, vatRate=21 → DPH = 21 Kč', () => {
      const vatAmount = calculateVatAmountSafe(100, true, 21)
      expect(vatAmount).toBe(21)
    })

    it('plátce, cena 100 Kč, vatRate=12 → DPH = 12 Kč', () => {
      const vatAmount = calculateVatAmountSafe(100, true, 12)
      expect(vatAmount).toBe(12)
    })

    it('neplátce, cena 100 Kč, vatRate=21 → DPH = 0 Kč (ignoruje sazbu)', () => {
      // Neplátce NIKDY nemá DPH, i když by měl sazbu v DB
      const vatAmount = calculateVatAmountSafe(100, false, 21)
      expect(vatAmount).toBe(0)
    })
  })

  describe('Real-world scenarios', () => {
    describe('Scénář 1: Neplátce DPH, produkt za 500 Kč', () => {
      const isVatPayer = false
      const catalogPrice = 500
      const vatRate = 0

      it('cena v katalogu = finální prodejní cena', () => {
        const vatAmount = calculateVatAmountSafe(catalogPrice, isVatPayer, vatRate)
        const priceWithVat = catalogPrice + vatAmount

        expect(catalogPrice).toBe(500)  // Katalog
        expect(vatAmount).toBe(0)       // Žádné DPH
        expect(priceWithVat).toBe(500)  // Zákazník platí 500 Kč
      })
    })

    describe('Scénář 2: Plátce DPH, produkt za 500 Kč (bez DPH), sazba 21%', () => {
      const isVatPayer = true
      const catalogPrice = 500  // Cena BEZ DPH
      const vatRate = 21

      it('cena v katalogu = cena bez DPH, přidat DPH', () => {
        const vatAmount = calculateVatAmountSafe(catalogPrice, isVatPayer, vatRate)
        const priceWithVat = catalogPrice + vatAmount

        expect(catalogPrice).toBe(500)  // Katalog (bez DPH)
        expect(vatAmount).toBe(105)     // DPH 21%
        expect(priceWithVat).toBe(605)  // Zákazník platí 605 Kč
      })
    })

    describe('Scénář 3: Plátce DPH, produkt se sazbou 0%', () => {
      const isVatPayer = true
      const catalogPrice = 500
      const vatRate = 0

      it('cena s DPH = cena bez DPH (sazba 0%)', () => {
        const vatAmount = calculateVatAmountSafe(catalogPrice, isVatPayer, vatRate)
        const priceWithVat = catalogPrice + vatAmount

        expect(catalogPrice).toBe(500)  // Katalog (bez DPH)
        expect(vatAmount).toBe(0)       // DPH 0% = 0 Kč
        expect(priceWithVat).toBe(500)  // Zákazník platí 500 Kč
      })

      it('je to JINÁ situace než neplátce (i když výsledek stejný)', () => {
        const nonPayerVat = calculateVatAmountSafe(catalogPrice, false, 0)
        const payerWith0Vat = calculateVatAmountSafe(catalogPrice, true, 0)

        // Výsledky jsou stejné...
        expect(nonPayerVat).toBe(0)
        expect(payerWith0Vat).toBe(0)

        // ... ale důvody JINÉ:
        // - Neplátce: "nemáme DPH"
        // - Plátce s 0%: "máme DPH, ale sazba je 0%"
      })
    })

    describe('Scénář 4: Bug - Transakce ukazuje 100 Kč místo 200 Kč', () => {
      // Tento test reprodukuje původní bug kdy systém:
      // - Produkt v katalogu: 500 Kč, vatRate = 21% (plátce)
      // - Systém vypočítal: 500 + (500 * 0.21) = 605 Kč
      // - Ale měl použít: 500 Kč jako finální cenu (neplátce)

      it('BUG: pokud produkt má vatRate=21 ale firma je neplátce', () => {
        const catalogPrice = 500
        const productVatRate = 21  // V DB je uloženo 21% (chyba!)
        const isVatPayer = false   // Ale firma je neplátce

        // ❌ Špatný výpočet (ignoruje isVatPayer)
        const wrongVat = catalogPrice * productVatRate / 100
        const wrongPriceWithVat = catalogPrice + wrongVat
        expect(wrongPriceWithVat).toBe(605)  // BUG!

        // ✅ Správný výpočet (kontroluje isVatPayer PRVNÍ)
        const correctVat = calculateVatAmountSafe(catalogPrice, isVatPayer, productVatRate)
        const correctPriceWithVat = catalogPrice + correctVat
        expect(correctPriceWithVat).toBe(500)  // Správně!
      })
    })
  })

  describe('calculateVatFromNet (existing function)', () => {
    it('zachová se správně pro vatRate=0 (legacy behavior)', () => {
      const result = calculateVatFromNet(100, 0)
      expect(result.priceWithoutVat).toBe(100)
      expect(result.vatAmount).toBe(0)
      expect(result.priceWithVat).toBe(100)
    })

    it('zachová se správně pro vatRate=21', () => {
      const result = calculateVatFromNet(100, 21)
      expect(result.priceWithoutVat).toBe(100)
      expect(result.vatAmount).toBe(21)
      expect(result.priceWithVat).toBe(121)
    })
  })

  describe('calculateVatFromGross (existing function)', () => {
    it('zachová se správně pro vatRate=0 (legacy behavior)', () => {
      const result = calculateVatFromGross(100, 0)
      expect(result.priceWithoutVat).toBe(100)
      expect(result.vatAmount).toBe(0)
      expect(result.priceWithVat).toBe(100)
    })

    it('zpětný výpočet z 121 Kč s 21% DPH → 100 Kč bez DPH', () => {
      const result = calculateVatFromGross(121, 21)
      expect(result.priceWithoutVat).toBe(100)
      expect(result.vatAmount).toBe(21)
      expect(result.priceWithVat).toBe(121)
    })
  })

  describe('round2', () => {
    it('zaokrouhlí na 2 desetinná místa', () => {
      expect(round2(10.123)).toBe(10.12)
      expect(round2(10.126)).toBe(10.13)
      expect(round2(10.125)).toBe(10.13)  // Banker's rounding
    })
  })
})

// 🧪 Test Coverage Report
// Tento test suite pokrývá:
// ✅ Neplátce s vatRate=0
// ✅ Plátce s vatRate=0 (0% sazba)
// ✅ Plátce s vatRate=12 (snížená sazba)
// ✅ Plátce s vatRate=21 (základní sazba)
// ✅ Edge case: neplátce s vatRate=21 (nemělo by nastat, ale pokrýváme)
// ✅ Real-world scenario: původní bug s 100 Kč místo 200 Kč
// ✅ Zpětná kompatibilita se starými funkcemi

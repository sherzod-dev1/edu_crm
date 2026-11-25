import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, Calendar, CreditCard } from 'lucide-react';
import styles from './contractModal.module.css';

const ContractModal = ({ contract, isOpen, onClose, onRenew }) => {
  if (!isOpen || !contract) return null;

  const planName = contract.plan || 'Standart';
  const planLower = planName.toLowerCase();
  const isStarter = planLower === 'starter';
  const isPremium = planLower === 'premium';

  let monthlyAmount = '1 200 000';
  let studentsRange = '601 - 1000';
  let planBadgeText = '⭐ STANDART TARIF';

  if (isStarter) {
    monthlyAmount = '800 000';
    studentsRange = '200 - 600';
    planBadgeText = '🚀 STARTER TARIF';
  } else if (isPremium) {
    monthlyAmount = '1 800 000';
    studentsRange = '1001 - 1800';
    planBadgeText = '👑 PREMIUM TARIF';
  }

  const contractNumber = contract.contract_number || 'EDU-SH-2026-001';
  const adminName = contract.admin?.full_name || contract.center_name || 'Administrator';
  const centerName = contract.center_name || contract.branch?.name || adminName;
  const adminPhone = contract.admin?.phone || contract.branch?.phone || '+998 90 123 45 67';
  const adminEmail = contract.admin?.email || 'admin@edu.uz';
  const startDate = contract.start_date || new Date().toISOString().split('T')[0];
  const endDate = contract.end_date || '2026-11-06';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrapper}>
            <div className={styles.iconShield}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Rasmiy Shartnoma Hujjati</h3>
              <p className={styles.modalSubtitle}>№ {contractNumber} • {planName} Tarifi ({studentsRange} talaba)</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Yopish">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Legal Agreement Paper */}
        <div className={styles.modalBody}>
          <div className={styles.documentPaper}>
            <div className={styles.docHeader}>
              <h2 className={styles.docTitle}>
                DASTURIY TA'MINOTDAN (SaaS) FOYDALANISH VA XIZMAT KO'RSATISH BO'YICHA OYLIK SHARTNOMA
              </h2>
              <div className={styles.docSubtitle}>№ {contractNumber}</div>
              <div className={styles.docMetaRow}>
                <span>Toshkent shahri</span>
                <span>Tuzilgan sana: {startDate}</span>
              </div>
            </div>

            {/* Tomonlar */}
            <div className={styles.partiesGrid}>
              <div className={styles.partyBox}>
                <h4>1. IJROCHI (PLATFORMA EGASI):</h4>
                <p><strong>"EDU CRM SYSTEMS" MCHJ</strong></p>
                <p>Vakil: Bosh Administrator (Super Admin)</p>
                <p>Manzil: Toshkent sh., IT Park binosi</p>
                <p>Email: support@educrm.uz</p>
                <p>Telefon: +998 71 200 00 00</p>
              </div>

              <div className={styles.partyBox}>
                <h4>2. BUYURTMACHI (O'QUV MARKAZ):</h4>
                <p><strong>"{centerName}"</strong></p>
                <p>Mas'ul shaxs: {adminName}</p>
                <p>Telefon: {adminPhone}</p>
                <p>Email: {adminEmail}</p>
                <p>Filial: {contract.branch?.name || "Asosiy markaz"}</p>
              </div>
            </div>

            {/* 1. Shartnoma predmeti */}
            <h4 className={styles.sectionTitle}>1. SHARTNOMA PREDMETI</h4>
            <p>
              1.1. Ijrochi ushbu shartnoma shartlariga muvofiq Buyurtmachiga "EDU CRM" o'quv markazlarini
              avtomatlashtirilgan boshqaruv bulutli axborot tizimidan foydalanish huquqini (litsenziya) taqdim etadi,
              Buyurtmachi esa ko'rsatilgan xizmatlar uchun belgilangan tarif bo'yicha to'lovni o'z vaqtida amalga oshirish majburiyatini oladi.
            </p>

            {/* 2. Tarif va To'lov */}
            <h4 className={styles.sectionTitle}>2. TARIF REJASI VA TO'LOV TARTIBI</h4>
            <div className={styles.tariffHighlightBox}>
              <div className={styles.tariffHighlightLeft}>
                <span className={styles.tariffPlanTitle}>
                  {planBadgeText} ({studentsRange} talaba)
                </span>
                <span className={styles.tariffDates}>
                  Amal qilish muddati: {startDate} dan {endDate} gacha (1 oy)
                </span>
              </div>
              <div className={styles.tariffPriceBig}>
                {monthlyAmount} so'm / oy
              </div>
            </div>

            <p>
              2.1. Tanlangan <strong>{planName}</strong> tarifi bo'yicha oylik abonent to'lovi qat'iy <strong>{monthlyAmount} so'm</strong>ni tashkil etadi (Talabalar sig'imi: <strong>{studentsRange}</strong> nafargacha).
            </p>
            <p>
              2.2. To'lov shartnoma tuzilgan kundan boshlab hisoblanadi va keyingi oy davriga o'tish uchun shartnoma muddati tugashiga kamida 5 kun qolganda to'lanishi tavsiya etiladi.
            </p>
            <p>
              2.3. {isStarter
                ? "🚀 Starter tarif 200 tadan 600 tagacha talabaga ega bo'lgan boshlang'ich markazlar uchun mo'ljallangan (boshlang'ich kassa, dars jadvali va davomat)."
                : isPremium
                ? "👑 Premium tarif 1001 tadan 1800 tagacha talabaga ega yirik markazlar uchun barcha kengaytirilgan imkoniyatlarni (Imtihonlar, Sertifikatlar, Invoyslar, Lidlar/CRM, SMS, Audit tarixi) o'z ichiga oladi."
                : "⭐ Standart tarif 601 tadan 1000 tagacha talabaga ega o'quv markazlari uchun barcha boshlang'ich modullarga qo'shimcha ravishda Lidlar (Murojaatlar & CRM voronkasi), Filiallar, Xonalar va kengaytirilgan moliya modullarini o'z ichiga oladi."}
            </p>

            {/* 3. Tomonlarning majburiyatlari */}
            <h4 className={styles.sectionTitle}>3. TOMONLARNING HUQUQ VA MAJBURIYATLARI</h4>
            <p>
              3.1. <strong>Ijrochi majburiyatlari:</strong> Tizimning 24/7 uzluksiz ishlashini (99.9% uptime), kiritilgan barcha ma'lumotlarning to'liq maxfiyligi va xavfsizligini ta'minlash, muntazam yangilanishlar va texnik yordam ko'rsatish.
            </p>
            <p>
              3.2. <strong>Buyurtmachi majburiyatlari:</strong> Tizimdan belgilangan qoidalarga asosan foydalanish, shaxsiy hisob parollarini uchinchi shaxslarga bermaslik va oylik abonent to'lovlarini o'z vaqtida amalga oshirish.
            </p>

            {/* 4. Rekvizitlar va Muhr */}
            <div className={styles.stampsRow}>
              <div className={styles.stampBox}>
                <strong>IJROCHI UCHUN:</strong>
                <div className={styles.signatureLine}>
                  Super Admin (Sayt yaratuvchisi)
                </div>
                <div className={styles.officialBadgeStamp}>
                  ✅ TASDIQLANDI • EDU CRM
                </div>
              </div>

              <div className={styles.stampBox}>
                <strong>BUYURTMACHI UCHUN:</strong>
                <div className={styles.signatureLine}>
                  {adminName} (Markaz rahbari)
                </div>
                <div className={styles.officialBadgeStamp}>
                  ✅ TASDIQLANDI • SHARTNOMA
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Holati: <strong style={{ color: '#10b981' }}>Faol shartnoma</strong> • To'lov: <strong>{monthlyAmount} so'm/oy</strong>
          </div>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.closeBtn}
              style={{ width: 'auto', padding: '8px 16px', background: '#e2e8f0', borderRadius: '10px' }}
              onClick={handlePrint}
            >
              <Printer size={16} style={{ marginRight: '6px' }} />
              Chop etish (Print / PDF)
            </button>
            {onRenew && (
              <button
                type="button"
                className={styles.closeBtn}
                style={{
                  width: 'auto',
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: '#ffffff',
                  fontWeight: 700,
                  borderRadius: '10px',
                }}
                onClick={() => {
                  onRenew(contract.id);
                  onClose();
                }}
              >
                Muddati uzaytirish (+1 oy)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractModal;

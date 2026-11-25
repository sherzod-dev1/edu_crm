import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyContract, renewContract } from '../../store/slices/contractSlice';
import ContractModal from '../ContractModal';
import styles from './contractReminder.module.css';
import { AlertTriangle, AlertCircle, FileText, RefreshCw, X, ChevronDown, CheckCircle2 } from 'lucide-react';

const ContractReminderBanner = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});
  const { myContract } = useSelector((state) => state.contract || {});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [renewSuccessMsg, setRenewSuccessMsg] = useState('');

  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    // Only fetch for Admin users
    if (user && isAdmin) {
      dispatch(fetchMyContract());
    }
  }, [dispatch, user, isAdmin]);

  // If not admin or no contract data, don't show
  if (!isAdmin || !myContract || myContract.is_super_admin) {
    return null;
  }

  const daysLeft = myContract.days_left !== undefined ? myContract.days_left : 30;
  const isExpired = myContract.is_expired || daysLeft < 0;
  const isExpiringSoon = myContract.is_expiring_soon || (daysLeft <= 5 && daysLeft >= 0);

  // If contract is neither expiring soon (<= 5 days) nor expired, don't show the warning banner
  if (!isExpiringSoon && !isExpired && !renewSuccessMsg) {
    return null;
  }

  const plan = myContract.plan || 'Standart';
  const planLower = plan.toLowerCase();
  const isStarter = planLower === 'starter';
  const isPremium = planLower === 'premium';

  let monthlyPriceText = "1 200 000 so'm";
  let planBadgeClass = styles.badgePlanStandart;
  let planLabel = "⭐ Standart Tarif (601-1000)";

  if (isStarter) {
    monthlyPriceText = "800 000 so'm";
    planBadgeClass = styles.badgePlanStarter;
    planLabel = "🚀 Starter Tarif (200-600)";
  } else if (isPremium) {
    monthlyPriceText = "1 800 000 so'm";
    planBadgeClass = styles.badgePlanPremium;
    planLabel = "👑 Premium Tarif (1001-1800)";
  }

  const contractNumber = myContract.contract_number || 'EDU-SH-2026-001';

  const handleRenew = async (contractId) => {
    const id = contractId || myContract.id;
    if (!id) return;
    try {
      const res = await dispatch(renewContract({ id, months: 1 }));
      if (!res.error) {
        setRenewSuccessMsg("Shartnoma muvaffaqiyatli +1 oyga uzaytirildi! Yangi muddat hisoblandi.");
        dispatch(fetchMyContract());
        setTimeout(() => setRenewSuccessMsg(''), 6000);
      } else {
        alert("Xatolik: " + (res.payload || "Shartnomani uzaytirib bo'lmadi"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isMinimized) {
    return (
      <>
        <div
          className={`${styles.minimizedPill} ${isExpired ? styles.minimizedPillExpired : ''}`}
          onClick={() => setIsMinimized(false)}
          title="Eslatmani to'liq ochish"
        >
          {isExpired ? <AlertCircle size={15} color="#ef4444" /> : <AlertTriangle size={15} color="#f59e0b" />}
          <span>
            {isExpired
              ? `⛔ Shartnoma tugagan (${plan}: ${monthlyPriceText})`
              : `⚠️ Shartnoma muddati tugamoqda: ${daysLeft === 0 ? "Bugun oxirgi kun" : `${daysLeft} kun qoldi`} (${plan}: ${monthlyPriceText})`}
          </span>
          <ChevronDown size={14} />
        </div>

        <ContractModal
          contract={myContract}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onRenew={handleRenew}
        />
      </>
    );
  }

  return (
    <>
      <div className={styles.bannerWrapper}>
        <div className={isExpired ? styles.bannerExpired : styles.bannerExpiring}>
          <div className={styles.bannerContent}>
            {/* Left Section with Animated Icon and Text */}
            <div className={styles.leftSection}>
              <div className={isExpired ? styles.iconWrapperExpired : styles.iconWrapperExpiring}>
                {isExpired ? <AlertCircle size={26} /> : <AlertTriangle size={26} />}
              </div>

              <div className={styles.textGroup}>
                <h3 className={`${styles.bannerTitle} ${isExpired ? styles.bannerTitleExpired : ''}`}>
                  {isExpired
                    ? "⛔ Diqqat! Shartnoma muddati tugagan"
                    : "⚠️ Shartnoma muddati tugamoqda, uzaytirishni unutmang!"}
                </h3>

                <p className={`${styles.bannerSubtitle} ${isExpired ? styles.bannerSubtitleExpired : ''}`}>
                  {isExpired
                    ? "O'quv markazingiz xizmati uzluksiz ishlashi uchun oylik to'lovni amalga oshiring va shartnomani uzaytiring."
                    : `Super Admin bilan tuzilgan oylik shartnoma ${myContract.end_date} sanasida yakunlanadi. Uzluksiz foydalanish uchun muddatni uzaytiring.`}
                </p>

                {/* Tariff & Countdown Badges */}
                <div className={styles.badgesRow}>
                  <span className={planBadgeClass}>
                    {planLabel}
                  </span>

                  <span className={styles.badgePrice}>
                    💰 Oylik to'lov: <strong>{monthlyPriceText}</strong>
                  </span>

                  <span className={`${styles.badge} ${isExpired ? styles.badgeCountdownExpired : styles.badgeCountdown}`}>
                    ⏳ {isExpired ? "Muddati o'tgan" : daysLeft === 0 ? "Bugun oxirgi kun!" : `${daysLeft} kun qoldi`}
                  </span>

                  <span style={{ fontSize: '12px', color: '#78350f', fontWeight: 600 }}>
                    № {contractNumber}
                  </span>
                </div>

                {renewSuccessMsg && (
                  <div style={{ marginTop: '8px', color: '#047857', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> {renewSuccessMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className={styles.rightActions}>
              <button
                type="button"
                className={styles.btnViewContract}
                onClick={() => setIsModalOpen(true)}
              >
                <FileText size={15} />
                <span>Shartnomani ko'rish</span>
              </button>

              <button
                type="button"
                className={styles.btnRenew}
                onClick={() => handleRenew(myContract.id)}
              >
                <RefreshCw size={15} />
                <span>Muddati uzaytirish (+1 oy)</span>
              </button>

              <button
                type="button"
                className={styles.btnDismiss}
                onClick={() => setIsMinimized(true)}
                title="Kichraytirish"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ContractModal
        contract={myContract}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRenew={handleRenew}
      />
    </>
  );
};

export default ContractReminderBanner;

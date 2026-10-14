import Link from "next/link";

import { businessInfoCheckUrl, siteBusiness } from "@/lib/site-business";

import "./site-legal-footer.css";

export function SiteLegalFooter() {
  return (
    <footer className="glia-site-legal" aria-label="사업자 정보">
      <nav className="glia-site-legal__nav" aria-label="정책">
        <Link href="/legal/terms">이용약관</Link>
        <Link href="/legal/privacy">개인정보 처리방침</Link>
        <Link href="/legal/refund">취소 및 환불정책</Link>
      </nav>
      <p>상호 {siteBusiness.name}</p>
      <p>대표자 {siteBusiness.representative}</p>
      <p>
        사업자등록번호 {siteBusiness.registrationNumber}{" "}
        <a href={businessInfoCheckUrl} target="_blank" rel="noreferrer">
          사업자정보 확인
        </a>
      </p>
      <p>사업장 주소 {siteBusiness.address}</p>
      <p>
        유선번호 <a href={`tel:${siteBusiness.phone}`}>{siteBusiness.phone}</a>
      </p>
      <p>
        이메일 <a href={`mailto:${siteBusiness.email}`}>{siteBusiness.email}</a>
      </p>
      <p>호스팅서비스 {siteBusiness.hostingProvider}</p>
    </footer>
  );
}

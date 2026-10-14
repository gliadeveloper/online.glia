import { siteBusiness } from "@/lib/site-business";

import "@/components/site/site-legal-footer.css";

export function PrivacyPolicy() {
  return (
    <div className="glia-legal-page">
      <header className="glia-legal-page__intro">
        <h1>개인정보 처리방침</h1>
        <p>시행일자: 2026. 10. 14.</p>
      </header>
      <div className="glia-legal-doc">
        <p>
          {siteBusiness.name}(대표 {siteBusiness.representative}, 이하 “회사”)는 개인정보 보호법 등
          관련 법령에 따라 회원의 개인정보를 처리합니다.
        </p>

        <h2>1. 처리 목적</h2>
        <ul>
          <li>회원 가입, 본인 확인, 계정 관리</li>
          <li>상품 주문, 결제, 수강과 코칭 제공, 환불</li>
          <li>고객 문의 대응</li>
          <li>회원이 동의한 경우의 소식과 혜택 안내</li>
        </ul>

        <h2>2. 처리하는 항목</h2>
        <ul>
          <li>필수: 이메일, 비밀번호(저장 시 해시), 이름 또는 닉네임, 가입 경로</li>
          <li>카카오 로그인 시: 카카오가 제공에 동의한 계정 식별 정보</li>
          <li>거래: 주문, 결제 금액, 결제 식별값, 쿠폰 사용, 환불 신청 내용</li>
          <li>이용: 수강과 코칭 기록, 커뮤니티 글, 데일리 체크인 응답</li>
          <li>자동 수집: 로그인 세션, 접속 기록</li>
        </ul>
        <p>주민등록번호는 수집하지 않습니다. 카드번호는 회사가 저장하지 않고 결제대행사가 처리합니다.</p>

        <h2>3. 보유 기간</h2>
        <p>
          회원 정보는 탈퇴 시까지 보관합니다. 전자상거래법에 따른 계약·결제·환불 기록은 법령이 정한
          기간 동안 보관합니다. 목적 달성 뒤 또는 기간이 지나면 지체 없이 파기합니다.
        </p>

        <h2>4. 제3자 제공과 처리 위탁</h2>
        <p>회사는 원칙적으로 개인정보를 제3자에게 판매하지 않습니다. 서비스 제공을 위해 아래와 같이 처리를 맡깁니다.</p>
        <ul>
          <li>토스페이먼츠: 전자결제 승인, 취소, 환불</li>
          <li>{siteBusiness.hostingProvider}: 서비스 호스팅</li>
          <li>카카오: 회원이 카카오 로그인을 선택한 경우의 인증</li>
        </ul>

        <h2>5. 회원의 권리</h2>
        <p>
          회원은 자신의 개인정보를 열람, 정정, 삭제, 처리 정지, 동의 철회할 수 있습니다.{" "}
          <a href={`mailto:${siteBusiness.supportEmail}`}>{siteBusiness.supportEmail}</a>로 요청하면
          법령에서 정한 기한 안에 처리합니다. 법령에 따라 보관해야 하는 기록은 삭제가 제한될 수 있습니다.
        </p>

        <h2>6. 안전성</h2>
        <p>
          회사는 비밀번호를 해시로 저장하고, 접근 권한을 필요한 범위로 제한하며, 결제 정보는
          결제대행사를 통해 처리합니다.
        </p>

        <h2>7. 개인정보 보호 책임</h2>
        <ul>
          <li>상호 {siteBusiness.name}</li>
          <li>대표자 {siteBusiness.representative}</li>
          <li>
            연락처 {siteBusiness.phone} ·{" "}
            <a href={`mailto:${siteBusiness.supportEmail}`}>{siteBusiness.supportEmail}</a>
          </li>
          <li>주소 {siteBusiness.address}</li>
        </ul>
        <p>이 방침을 바꾸면 시행일 전에 서비스에 공지합니다.</p>
      </div>
    </div>
  );
}

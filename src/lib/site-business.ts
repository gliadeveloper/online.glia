/** Facts printed on the customer footer. Do not invent a mail-order report number. */
export const siteBusiness = {
  name: "웰니스몰글리아",
  representative: "옥아람",
  registrationNumber: "232-15-02502",
  address: "경기도 용인시 기흥구 평촌 3로 14,1층(동백동)",
  phone: "031-283-1909",
  email: "team.glia.support@gmail.com",
  supportEmail: "team.glia.support@gmail.com",
  hostingProvider: "가비아",
} as const;

/** 공정거래위원회 사업자정보 공개. 사업자등록번호에서 하이픈을 뺀 값. */
export const businessInfoCheckUrl =
  "https://www.ftc.go.kr/bizCommPop.do?wrkr_no=2321502502";

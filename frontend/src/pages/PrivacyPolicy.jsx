import LegalDocument from "../components/LegalDocument";
import { privacyPolicy } from "../content/privacyPolicy";

export default function PrivacyPolicy() {
  return <LegalDocument data={privacyPolicy} />;
}
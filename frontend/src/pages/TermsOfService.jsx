import LegalDocument from "../components/LegalDocument";
import { termsOfService } from "../content/termsOfService";

export default function TermsOfService() {
  return <LegalDocument data={termsOfService} />;
}
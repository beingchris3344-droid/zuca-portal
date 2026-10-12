import LegalDocument from "../components/LegalDocument";
import { cookiesPolicy } from "../content/cookiesPolicy";

export default function CookiesPolicy() {
  return <LegalDocument data={cookiesPolicy} />;
}
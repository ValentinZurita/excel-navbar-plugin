# Privacy Policy for Sheet Navigator

Last Updated: May 26, 2026

Valentin Perez ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains our practices regarding data collection and usage for the **Sheet Navigator** Office Add-in (the "App").

Please read this policy carefully to understand how your information is treated. By installing and using the App, you agree to the terms outlined in this Privacy Policy.

---

## 1. No Collection of Personal Information

**Sheet Navigator does not collect, store, transmit, or share any personal data, user credentials, or identifying information.**

The App is designed as a local-first utility. We do not run external servers, databases, or analytics engines that collect or store your information.

---

## 2. Technical and Spreadsheet Data

To provide its core functionality (worksheet listing, sheet previews, groups, and drag-and-drop reordering), the App interacts directly with your active Microsoft Excel workbook via the official Microsoft Office JavaScript API (`Office.js`).

* **Spreadsheet Names & Metadata:** The App reads the names and visibility status of your sheets inside the active workbook to display them in the sidebar. This data never leaves your computer.
* **Groups and Layout Configurations:** When you organize sheets into collapsible folders or reorder them, these settings are saved **entirely locally** using the workbook's native custom properties or local storage. No sheet content, cell data, or structure is ever transmitted outside your local Excel application environment.
* **No Telemetry or Tracking:** The App does not contain tracking scripts, third-party analytics (like Google Analytics), or telemetry frameworks. 

---

## 3. Third-Party Services

The App is hosted statically on **GitHub Pages**. When you load the taskpane, your Excel client fetches the static frontend assets (HTML, CSS, JS) from GitHub's servers. GitHub may collect standard server logs (such as your IP address and user-agent) for security and operational purposes in accordance with the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement). We do not have access to or control over these server logs.

---

## 4. Updates to this Privacy Policy

We may update our Privacy Policy from time to time. Any changes will be posted on this page, and the "Last Updated" date at the top will be updated accordingly.

---

## 5. Contact and Support

If you have any questions, concerns, or feedback regarding this Privacy Policy or the privacy practices of Sheet Navigator, please contact us by opening an issue on our official support page:

* **GitHub Support Page:** [https://github.com/ValentinZurita/excel-navbar-plugin](https://github.com/ValentinZurita/excel-navbar-plugin)

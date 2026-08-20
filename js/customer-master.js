/* RAJ LIVE PRICEBOOK V46 CUSTOMER MASTER FALLBACK.
   Normal workflow: keep a worksheet named CUSTOMER MASTER inside the Price Excel workbook.
   When Pixaro admin uses "Sync Price Excel", V46 imports CUSTOMER NAME / MOBILE NUMBER /
   PASSWORD / optional CUSTOMER ID into browser storage for static/offline login.

   Optional manual fallback rows can be placed here for private testing:
   { name:'CUSTOMER NAME', mobile:'9876543210', password:'raj123', customerId:'C001' }

   IMPORTANT: Public GitHub/static hosting cannot securely protect passwords stored in JS/Excel.
   Production customer authorization should use the secure /api/auth/login backend.
*/
window.RAJ_CUSTOMER_MASTER = window.RAJ_CUSTOMER_MASTER || [];

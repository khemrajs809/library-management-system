const pool = require('./db');

const englishDetails = [
  { title: 'Admin Dashboard & Security', desc: 'Provides root access to the system. Admins can create, edit, and delete librarian accounts securely (using bcrypt password hashing). Features a comprehensive Audit Log viewer that tracks every action (login, add, update, delete) performed by staff. Real-time statistics cards show total books, active members, and outstanding fines.' },
  { title: 'Book Inventory Management', desc: 'A dual-view (Grid & List) inventory system. Staff can add books with custom or auto-generated IDs and ISBNs. Supports uploading book cover images (stored via Multer), tracking physical copies, generating and downloading PDF barcodes natively via jsBarcode & jsPDF, and importing bulk book data using CSV files.' },
  { title: 'Member Directory & Profiles', desc: 'Allows registration of library members with profile picture uploads. Clicking on a member opens a detailed Profile Modal displaying their contact info, total borrowing stats, active/overdue issues, and complete borrowing history. Staff can instantly process fine payments directly from this profile view.' },
  { title: 'Circulation Desk & Scanner', desc: 'The core borrowing module. Librarians can issue books by searching for members and books simultaneously. Enforces rules like maximum borrowing limits. The dedicated Scanner Mode enables lightning-fast book returns: staff simply focus the input field, scan the barcode with a physical scanner, and the system automatically returns the book and calculates fines.' },
  { title: 'Return History & Fines', desc: 'A permanent historical log of all borrowing activity. Shows exactly when a book was issued, its original due date, the actual return date, and any fines incurred. Fines are calculated automatically based on days overdue using robust backend cron jobs and socket.io for real-time notifications.' },
  { title: 'Advanced UI/UX & Theming', desc: 'Built with an enterprise-grade Angular frontend. Features an immersive Dark Theme and an eye-comfort Night Mode (sepia filter). Includes responsive layouts, skeleton loaders for smooth data fetching, custom styled scrollbars, and micro-animations for an exceptional user experience.' },
  { title: 'Robust Backend Architecture', desc: 'Powered by Node.js, Express, and a fully relational MariaDB SQL database. Secured via JWT authentication, Helmet.js headers, and strict rate-limiting middlewares to prevent brute-force attacks. Features a perfectly organized RESTful API.' },
  { title: 'Automated Cron Jobs & Real-time Sockets', desc: 'The backend continuously runs automated background jobs to identify overdue books and automatically apply fines. It uses Socket.io to instantly push these overdue notifications directly to the frontend Dashboard without requiring a page refresh.' },
  { title: 'Data Integrity & Validations', desc: 'Maintains absolute data consistency. Prevents issuing books to members with outstanding fines or hitting borrowing caps. Employs comprehensive frontend Angular form validations and strict backend data sanitization to prevent SQL injections.' }
];

const hinglishDetails = [
  { title: 'Admin Dashboard & Security', desc: 'Ye admin ko poora control deta hai. Admins naye librarians add aur delete kar sakte hain (passwords securely hash hote hain). Isme ek Audit Log viewer hai jo system ki har choti-badi activity (jaise kisne kya delete ya add kiya) track karta hai. Saath hi live statistics dikhte hain.' },
  { title: 'Book Inventory Management', desc: 'Isme Grid aur List dono views hain. Staff auto-generated ID aur ISBN ke sath books add kar sakte hain. Book cover photo upload karna, multiple physical copies manage karna, PDF me barcodes generate karke download karna, aur CSV se ek sath bahot sari books import karna isme shamil hai.' },
  { title: 'Member Directory & Profiles', desc: 'Naye members ko unki photo ke sath register karein. Kisi bhi member pe click karne se unka poora chittha (Profile) khul jata hai jisme unki contact details, kitni books li hain, overdue books, aur poori borrowing history dikhti hai. Fine payment bhi yahin se ek click me ho jata hai.' },
  { title: 'Circulation Desk & Scanner', desc: 'Ye book issue karne ki main jagah hai. Limit se zyada books issue nahi ho sakti. Isme ek special Scanner Mode hai jisme cursor rakh ke barcode scan karte hi book apne aap return ho jati hai aur fine calculate ho jata hai - bahut hi fast aur easy!' },
  { title: 'Return History & Fines', desc: 'Ye ek permanent record hai jisme aaj tak ki saari returned books ki details milti hain. Issue date, due date, return date aur kitna fine laga, sab yahan list hota hai. Fines backend me automatic calculate hote hain.' },
  { title: 'Advanced UI/UX & Theming', desc: 'Iska design bilkul modern aur professional hai. Isme Dark Theme aur aankhon ko aaram dene wala Night Mode (sepia) hai. Smooth loading ke liye skeleton loaders, animated buttons aur fully responsive design hai jo har screen par achha lagta hai.' },
  { title: 'Robust Backend Architecture', desc: 'Project ka backend Node.js, Express aur MariaDB SQL se bana hai. Ye poori tarah secure hai, jisme JWT login, Helmet security, aur rate-limiting ka use hua hai taaki koi system hack na kar sake.' },
  { title: 'Automated Cron Jobs & Live Sockets', desc: 'System me automatic cron jobs background me lagatar chalte hain jo overdue books ko dhundte hain aur fine lagate hain. Phir Socket.io ki madad se bina page refresh kiye sidha dashboard par live notification bhej dete hain.' },
  { title: 'Data Integrity & Validations', desc: 'System me data poori tarah safe aur correct rehta hai. Jinpe fine baki hai, unhe nayi book issue nahi hoti. Forms me galat info enter hone se rokne ke liye strict frontend aur backend validations lagaye gaye hain.' }
];

async function updateDb() {
    try {
        await pool.query('ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS english_details TEXT');
        await pool.query('ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS hinglish_details TEXT');
        
        await pool.query(
            'UPDATE project_notes SET english_details = ?, hinglish_details = ? WHERE id = 1',
            [JSON.stringify(englishDetails), JSON.stringify(hinglishDetails)]
        );
        
        console.log('Database updated with detailed notes.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateDb();

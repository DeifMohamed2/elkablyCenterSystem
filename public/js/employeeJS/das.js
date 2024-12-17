// function printReceipt(data = {}) {
//   const {
//     studentName = 'N/A',
//     teacherName = 'N/A',
//     subject = 'N/A',
//     paymentAmount = 0,
//     date = new Date().toLocaleDateString(),
//   } = data;

//   // English labels for the receipt
//   const englishLabels = {
//     title: 'ELKABLY CENTER',
//     date: 'Date',
//     studentName: 'Student Name',
//     teacherName: 'Teacher Name',
//     subject: 'Subject',
//     payment: 'Amount Paid',
//     thankYou: 'Thank you for choosing our center!',
//   };

//   // ESC/POS Printer Commands
//   const ESC_ALIGN_CENTER = '\x1B\x61\x01'; // Center align
//   const ESC_ALIGN_LEFT = '\x1B\x61\x00'; // Left align
//   const ESC_DOUBLE_SIZE = '\x1B\x21\x30'; // Double font size
//   const ESC_BOLD = '\x1B\x45\x01'; // Bold text
//   const ESC_NORMAL_SIZE = '\x1B\x21\x00'; // Normal font size
//   const ESC_CUT = '\x1D\x56\x42\x00'; // Full paper cut
//   const ESC_FEED_LINE = '\x0A'; // Line feed
//   const ESC_RESET = '\x1B\x40'; // Reset printer

//   // Function to format table rows: Left and Right with fixed width
//   function formatTableRow(field, value) {
//     const totalWidth = 40; // Total table width
//     const left = `${field}:`.padEnd(totalWidth / 2, ' '); // Field aligned left
//     const right = value.toString().padStart(totalWidth / 2, ' '); // Value aligned right
//     return left + right;
//   }

//   const lineSeparator = '-'.repeat(40); // Table separator line

//   // Build the receipt content
//   const receiptContent =
//     ESC_RESET +
//     ESC_ALIGN_CENTER +
//     ESC_BOLD +
//     ESC_DOUBLE_SIZE +
//     englishLabels.title + // Centered title in bold large font
//     ESC_FEED_LINE +
//     ESC_NORMAL_SIZE +
//     ESC_FEED_LINE +
//     ESC_ALIGN_LEFT +
//     `${englishLabels.teacherName}: ${teacherName}` + // Teacher name
//     ESC_FEED_LINE +
//     `${englishLabels.subject}: ${subject}` + // Subject name
//     ESC_FEED_LINE +
//     lineSeparator +
//     ESC_FEED_LINE +
//     formatTableRow(englishLabels.date, date) +
//     ESC_FEED_LINE +
//     formatTableRow(englishLabels.studentName, studentName) +
//     ESC_FEED_LINE +
//     formatTableRow(englishLabels.payment, `${paymentAmount} EGP`) +
//     ESC_FEED_LINE +
//     lineSeparator +
//     ESC_FEED_LINE +
//     ESC_ALIGN_CENTER +
//     ESC_NORMAL_SIZE +
//     ESC_FEED_LINE +
//     englishLabels.thankYou +
//     ESC_FEED_LINE +
//     ESC_FEED_LINE;

//   // Connect to QZ Tray and print the receipt
//   qz.websocket
//     .connect()
//     .then(() => {
//       console.log('Connected to QZ Tray.');

//       const config = qz.configs.create('Xprinter'); // Replace with your printer name

//       const printData = [
//         { type: 'raw', format: 'command', data: receiptContent },
//         { type: 'raw', format: 'command', data: ESC_CUT }, // Cut paper
//       ];

//       return qz.print(config, printData);
//     })
//     .then(() => console.log('Receipt printed successfully.'))
//     .catch((error) => console.error('Print error:', error))
//     .finally(() => qz.websocket.disconnect());
// }

// // Call the function with test data
// printReceipt({
//   studentName: 'John Doe',
//   teacherName: 'Ms. Smith',
//   subject: 'Mathematics',
//   paymentAmount: 200,
// });

// function printReceipt(data = {}) {
//   const {
//     studentName = 'N/A',
//     teacherName = 'N/A',
//     subject = 'N/A',
//     paymentAmount = 0,
//     date = new Date().toLocaleDateString(),
//   } = data;

//   // English labels for the receipt
//   const englishLabels = {
//     title: 'ELKABLY CENTER',
//     date: 'Date',
//     studentName: 'Student Name',
//     teacherName: 'Teacher Name',
//     subject: 'Subject',
//     payment: 'Amount Paid',
//     thankYou: 'Thank you for choosing our center!',
//   };

//   // ESC/POS Printer Commands
//   const ESC_ALIGN_CENTER = '\x1B\x61\x01'; // Center align
//   const ESC_ALIGN_LEFT = '\x1B\x61\x00'; // Left align
//   const ESC_DOUBLE_SIZE = '\x1B\x21\x30'; // Double font size
//   const ESC_BOLD = '\x1B\x45\x01'; // Bold text
//   const ESC_NORMAL_SIZE = '\x1B\x21\x00'; // Normal font size
//   const ESC_CUT = '\x1D\x56\x42\x00'; // Full paper cut
//   const ESC_FEED_LINE = '\x0A'; // Line feed
//   const ESC_RESET = '\x1B\x40'; // Reset printer
//   const ESC_TAB = '\x09'; // Tab spacing

//   // Function to format table rows: field (left) and value (right)
//   function formatTableRow(field, value) {
//     const fieldText = `${field}:`.padEnd(20, ' '); // Left column padded to 20 chars
//     const valueText = value.toString().padStart(20, ' '); // Right column aligned
//     return fieldText + valueText;
//   }

//   // Build the receipt content
//   const receiptContent =
//     ESC_RESET +
//     ESC_ALIGN_CENTER +
//     ESC_BOLD +
//     ESC_DOUBLE_SIZE +
//     englishLabels.title + // Title in bold large font
//     ESC_FEED_LINE +
//     ESC_NORMAL_SIZE +
//     ESC_FEED_LINE +
//     `${englishLabels.teacherName}: ${teacherName}` + // Teacher name centered
//     ESC_FEED_LINE +
//     `${englishLabels.subject}: ${subject}` +
//     ESC_FEED_LINE +
//     '----------------------------------------' +
//     ESC_FEED_LINE +
//     ESC_ALIGN_LEFT + // Table starts here
//     ESC_BOLD +
//     formatTableRow(englishLabels.date, date) +
//     ESC_FEED_LINE +
//     formatTableRow(englishLabels.studentName, studentName) +
//     ESC_FEED_LINE +
//     formatTableRow(englishLabels.payment, `${paymentAmount} EGP`) +
//     ESC_FEED_LINE +
//     '----------------------------------------' +
//     ESC_FEED_LINE +
//     ESC_ALIGN_CENTER +
//     ESC_NORMAL_SIZE +
//     englishLabels.thankYou + // Thank you message centered
//     ESC_FEED_LINE +
//     ESC_FEED_LINE +
//     ESC_FEED_LINE;

//   // Connect to QZ Tray and print the receipt
//   qz.websocket
//     .connect()
//     .then(() => {
//       console.log('Connected to QZ Tray.');

//       const config = qz.configs.create('Xprinter'); // Replace with your printer name

//       const printData = [
//         { type: 'raw', format: 'command', data: receiptContent },
//         { type: 'raw', format: 'command', data: ESC_CUT }, // Cut paper
//       ];

//       return qz.print(config, printData);
//     })
//     .then(() => console.log('Receipt printed successfully.'))
//     .catch((error) => console.error('Print error:', error))
//     .finally(() => qz.websocket.disconnect());
// }

// // Call the function with test data
// printReceipt({
//   studentName: 'John Doe',
//   teacherName: 'Ms. Smith',
//   subject: 'Mathematics',
//   paymentAmount: 200,
// });

// Get all students



function printReceipt(data = {}) {
  const {
    studentName = 'N/A',
    teacherName = 'N/A',
    subject = 'N/A',
    paymentAmount = 0,
    date = new Date().toLocaleDateString(),
  } = data;

  // English labels for the receipt
  const englishLabels = {
    title: 'ELKABLY CENTER',
    phone: '\u260E +201234567890', // Unicode for phone icon and example phone number
    date: 'Date',
    teacherName: 'Teacher Name',
    subject: 'Subject',
    studentName: 'Student Name',
    payment: 'Amount Paid',
    thankYou: 'Thank you for choosing our center!',
  };

  // ESC/POS Printer Commands
  const ESC_ALIGN_CENTER = '\x1B\x61\x01'; // Center align
  const ESC_ALIGN_LEFT = '\x1B\x61\x00'; // Left align
  const ESC_DOUBLE_SIZE = '\x1B\x21\x30'; // Double font size
  const ESC_BOLD = '\x1B\x45\x01'; // Bold text
  const ESC_NORMAL_SIZE = '\x1B\x21\x00'; // Normal font size
  const ESC_CUT = '\x1D\x56\x42\x00'; // Full paper cut
  const ESC_FEED_LINE = '\x0A'; // Line feed
  const ESC_RESET = '\x1B\x40'; // Reset printer

  // Helper to format table rows with borders
  function formatTableRow(field, value) {
    const totalWidth = 48; // Total width for a line
    const left = field.padEnd(20, ' '); // Adjust left column width
    const right = value.toString().padStart(20, ' '); // Adjust right column width
    return `| ${left} | ${right} |`;
  }

  const lineSeparator = '-'.repeat(48); // Table line separator

  // Build the receipt content
  const receiptContent =
    ESC_RESET +
    ESC_ALIGN_CENTER +
    ESC_BOLD +
    ESC_DOUBLE_SIZE +
    englishLabels.title + // Title in bold and double size
    ESC_FEED_LINE +
    ESC_NORMAL_SIZE +
    ESC_FEED_LINE +
    ESC_ALIGN_CENTER +
    englishLabels.phone + // Center-aligned phone number with icon
    ESC_FEED_LINE +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.date, date) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.teacherName, teacherName) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.subject, subject) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.studentName, studentName) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.payment, `${paymentAmount} EGP`) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    ESC_ALIGN_CENTER +
    ESC_BOLD +
    ESC_NORMAL_SIZE +
    englishLabels.thankYou +
    ESC_FEED_LINE +
    ESC_FEED_LINE;

  // Connect to QZ Tray and print the receipt
  qz.websocket
    .connect()
    .then(() => {
      console.log('Connected to QZ Tray.');

      const config = qz.configs.create('Xprinter'); // Replace with your printer name

      const printData = [
        { type: 'raw', format: 'command', data: receiptContent },
        { type: 'raw', format: 'command', data: ESC_CUT }, // Cut paper
      ];

      return qz.print(config, printData);
    })
    .then(() => console.log('Receipt printed successfully.'))
    .catch((error) => console.error('Print error:', error))
    .finally(() => qz.websocket.disconnect());
}

// Call the function with test data
printReceipt({
  studentName: 'John Doe',
  teacherName: 'Ms. Smith',
  subject: 'Mathematics',
  paymentAmount: 200,
});

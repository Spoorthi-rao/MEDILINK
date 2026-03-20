import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Service to generate professional medical PDF reports
 */
export const generateConsultationPDF = (patient, consult, prescriptions = [], labs = []) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header & Branding
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("MediLink Medical Center", 20, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("City Hospital Chennai • Tel: +91 44 2833 1111", 20, 32);

  // 2. Patient & Consultation Info
  doc.setTextColor(40, 44, 52);
  doc.setFontSize(16);
  doc.text("Patient Consultation Summary", 20, 55);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 58, pageWidth - 20, 58);

  doc.setFontSize(11);
  doc.text(`Patient Name: ${patient.name}`, 20, 70);
  doc.text(`Age/Gender: ${patient.age} / ${patient.gender}`, 20, 78);
  doc.text(`Patient ID: ${patient.patient_id}`, 140, 70);
  doc.text(`Date: ${new Date(consult.created_at).toLocaleDateString()}`, 140, 78);

  // 3. Clinical Details
  doc.setFont("helvetica", "bold");
  doc.text("Primary Diagnosis:", 20, 95);
  doc.setFont("helvetica", "italic");
  doc.text(`"${consult.diagnosis || 'General Consultation'}"`, 60, 95);

  doc.setFont("helvetica", "bold");
  doc.text("Symptoms:", 20, 105);
  doc.setFont("helvetica", "normal");
  doc.text(consult.symptoms?.join(', ') || 'None reported', 60, 105);

  // 4. Prescriptions Table
  if (prescriptions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Prescribed Medicines", 20, 120);
    
    doc.autoTable({
      startY: 125,
      head: [['Medicine', 'Dosage', 'Frequency', 'Duration']],
      body: prescriptions.map(p => [p.medicine, p.dosage, p.frequency, p.duration]),
      headStyles: { fillColor: [13, 148, 136] },
      margin: { left: 20, right: 20 }
    });
  }

  // 5. Lab Orders
  let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 125;
  if (labs.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Lab Investigations", 20, currentY);
    
    doc.autoTable({
      startY: currentY + 5,
      head: [['Test Name', 'Status', 'Result']],
      body: labs.map(l => [l.test_name, l.status.toUpperCase(), l.result || 'Awaiting']),
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: 20, right: 20 }
    });
  }

  // 6. Clinical Notes
  currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : currentY + 15;
  if (consult.clinical_notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Clinical Notes:", 20, currentY);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(consult.clinical_notes, pageWidth - 40);
    doc.text(splitNotes, 20, currentY + 7);
  }

  // 7. Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
    doc.text("This is an electronically generated report.", 20, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`${patient.name.replace(/\s+/g, '_')}_Report.pdf`);
};

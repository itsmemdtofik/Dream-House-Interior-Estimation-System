from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime
import os

PDF_DIR = "generated_pdfs"
os.makedirs(PDF_DIR, exist_ok=True)

def generate_pdf(data, estimate_id):
    """Generate a professional estimation PDF based on the Dream House Interior form"""
    filename = f"{PDF_DIR}/estimate_{estimate_id}.pdf"
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#000000'),
        spaceAfter=6,
        alignment=1  # Center
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#333333'),
        spaceAfter=2,
        alignment=1
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#000000'),
        spaceAfter=1
    )
    
    doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    
    # Title
    elements.append(Paragraph("Estimation Form", title_style))
    elements.append(Paragraph("Dream House Interior", subtitle_style))
    elements.append(Spacer(1, 12))
    
    # Header Information
    party_name = data.get("party_name", "N/A")
    contractor_name = data.get("contractor_name", "N/A")
    mobile = data.get("mobile_number", "N/A")
    location = data.get("location", "N/A")
    date_str = data.get("date", datetime.now().strftime("%d-%m-%Y"))
    if isinstance(date_str, datetime):
        date_str = date_str.strftime("%d-%m-%Y")
    
    header_info = f"""
    <b>Location:</b> {location}<br/>
    <b>Party Name:</b> {party_name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Mobile Number:</b> {mobile}<br/>
    <b>Contractor Name:</b> {contractor_name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Date:</b> {date_str}
    """
    elements.append(Paragraph(header_info, header_style))
    elements.append(Spacer(1, 12))
    
    # Items Table
    table_data = [["S.I.N°", "Description", "Size", "S.F.T", "Rate", "Amount", "Total"]]
    
    for item in data.get("items", []):
        serial_no = str(item.get("serial_number", ""))
        description = str(item.get("description", ""))
        size = str(item.get("size", "-"))
        sft = f"{item.get('sft', 0):.1f}" if item.get('sft') else "-"
        rate = f"{item.get('rate', 0):.0f}" if item.get('rate') else "-"
        amount = f"{item.get('amount', 0):.0f}" if item.get('amount') else "-"
        total = f"{item.get('total', item.get('amount', 0)):.0f}" if item.get('total') or item.get('amount') else "-"
        
        table_data.append([serial_no, description, size, sft, rate, amount, total])
    
    # Create and style table
    table = Table(table_data, colWidths=[0.6*inch, 1.8*inch, 0.9*inch, 0.7*inch, 0.7*inch, 0.8*inch, 0.8*inch])
    table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#cccccc')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        
        # Data rows
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f0f0')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        
        # Align text columns left
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 12))
    
    # Financial Summary
    gross = data.get("gross", 0)
    discount = data.get("discount", 0)
    advance = data.get("advance", 0)
    final = data.get("final", 0)
    
    summary_style = ParagraphStyle(
        'Summary',
        parent=styles['Normal'],
        fontSize=10,
        alignment=2  # Right align
    )
    
    summary_data = [
        ["Gross Total", f"₹ {gross:,.2f}"],
        ["Discount (%)", f"{discount:.1f}%"],
        ["Advance Payment", f"₹ {advance:,.2f}"],
        ["Final Total", f"₹ {final:,.2f}"],
    ]
    
    summary_table = Table(summary_data, colWidths=[2.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 0), (1, 2), 'Helvetica'),
        ('FONTNAME', (1, 3), (1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (1, 2), 9),
        ('FONTSIZE', (0, 3), (1, 3), 11),
        ('BACKGROUND', (0, 3), (1, 3), colors.HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (1, -1), 4),
    ]))
    
    elements.append(summary_table)
    
    # Build PDF
    doc.build(elements)
    return filename


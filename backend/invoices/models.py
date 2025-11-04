from django.db import models
from orders.models import Order
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from io import BytesIO
import os

class Invoice(models.Model):
    invoice_number = models.CharField(max_length=20, unique=True, editable=False)
    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name='invoice')
    
    invoice_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    
    pdf_file = models.FileField(upload_to='invoices/', blank=True, null=True)
    
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Facture {self.invoice_number}"
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.invoice_number = f"FAC-{timestamp}"
        super().save(*args, **kwargs)
    
    def generate_pdf(self):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
        elements = []
        styles = getSampleStyleSheet()
        
        # En-tête
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#2563eb'), alignment=TA_CENTER)
        elements.append(Paragraph(f"FACTURE N° {self.invoice_number}", title_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Informations magasin
        store_name = "Ville d'Avray" if self.order.store == 'ville_avray' else "Garches"
        store_info = f"""
        <b>Magasin de Vélos - {store_name}</b><br/>
        Adresse magasin<br/>
        Téléphone: 01 XX XX XX XX<br/>
        Email: contact@bikestore.fr
        """
        elements.append(Paragraph(store_info, styles['Normal']))
        elements.append(Spacer(1, 0.5*cm))
        
        # Informations client
        client = self.order.client
        client_info = f"""
        <b>Client:</b><br/>
        {client.full_name}<br/>
        {client.address}<br/>
        {client.postal_code} {client.city}<br/>
        Email: {client.email}<br/>
        Téléphone: {client.phone}
        """
        elements.append(Paragraph(client_info, styles['Normal']))
        elements.append(Spacer(1, 1*cm))
        
        # Tableau des articles
        data = [['Article', 'Qté', 'Prix HT', 'TVA', 'Total TTC']]
        for item in self.order.items.all():
            data.append([
                item.product.name,
                str(item.quantity),
                f"{item.unit_price_ht:.2f} €",
                f"{item.tva_rate}%",
                f"{item.subtotal_ttc:.2f} €"
            ])
        
        table = Table(data, colWidths=[8*cm, 2*cm, 3*cm, 2*cm, 3*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)
        elements.append(Spacer(1, 1*cm))
        
        # Totaux
        totals_data = [
            ['Sous-total HT:', f"{self.order.subtotal_ht:.2f} €"],
            ['TVA:', f"{self.order.total_tva:.2f} €"],
            ['Remise:', f"{self.order.discount_amount:.2f} €"],
            ['<b>TOTAL TTC:</b>', f"<b>{self.order.total_ttc:.2f} €</b>"]
        ]
        
        totals_table = Table(totals_data, colWidths=[14*cm, 4*cm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#2563eb')),
        ]))
        elements.append(totals_table)
        
        # Pied de page
        elements.append(Spacer(1, 2*cm))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, textColor=colors.grey)
        elements.append(Paragraph("Merci de votre confiance", footer_style))
        
        doc.build(elements)
        buffer.seek(0)
        
        # Sauvegarder le fichier PDF
        from django.core.files.base import ContentFile
        self.pdf_file.save(f'invoice_{self.invoice_number}.pdf', ContentFile(buffer.read()), save=True)
        
        return buffer

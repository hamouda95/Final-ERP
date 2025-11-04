from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        invoice = self.get_object()
        invoice.generate_pdf()
        return Response({'message': 'PDF generated successfully'})
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        invoice = self.get_object()
        if invoice.pdf_file:
            return FileResponse(invoice.pdf_file.open('rb'), as_attachment=True, filename=f'invoice_{invoice.invoice_number}.pdf')
        return Response({'error': 'PDF not generated'}, status=404)

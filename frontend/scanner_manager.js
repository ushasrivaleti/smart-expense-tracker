class ScannerManager {
    constructor() {
        this.video = document.getElementById('scanner-video');
        this.canvas = document.getElementById('scanner-canvas');
        this.modal = document.getElementById('scanner-modal');
        this.stream = null;
        this.onCaptureCallback = null;

        this.init();
    }

    init() {
        const btnLaunch = document.getElementById('btn-launch-scanner');
        const btnClose = document.getElementById('btn-close-scanner');
        const btnCapture = document.getElementById('btn-capture-receipt');

        if (btnLaunch) {
            btnLaunch.addEventListener('click', () => this.openScanner());
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => this.closeScanner());
        }

        if (btnCapture) {
            btnCapture.addEventListener('click', () => this.capture());
        }

        // Close on overlay click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeScanner();
            });
        }
    }

    async openScanner() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera access is not supported by your browser.');
            return;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: {ideal: 1280},
                    height: {ideal: 720}
                },
                audio: false
            });

            if (this.video) {
                this.video.srcObject = this.stream;
                this.modal.classList.add('active');
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            let msg = 'Could not access camera.';
            if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access in settings.';
            else if (err.name === 'NotFoundError') msg = 'No camera found on this device.';
            alert(msg);
        }
    }

    closeScanner() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) this.video.srcObject = null;
        if (this.modal) this.modal.classList.remove('active');
    }

    capture() {
        if (!this.video || !this.canvas || !this.stream) return;

        const context = this.canvas.getContext('2d');
        const width = this.video.videoWidth;
        const height = this.video.videoHeight;
        this.canvas.width = width;
        this.canvas.height = height;

        // Draw current video frame to canvas
        context.drawImage(this.video, 0, 0, width, height);

        // Visual feedback (flash effect)
        this.video.style.filter = 'brightness(2) contrast(1.5)';
        setTimeout(() => {
            if (this.video) this.video.style.filter = '';
        }, 150);

        // Capture full image for OCR
        this.canvas.toBlob((fullBlob) => {
            // Create a small thumbnail for preview
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            const thumbWidth = 120;
            const thumbHeight = (height / width) * thumbWidth;
            thumbCanvas.width = thumbWidth;
            thumbCanvas.height = thumbHeight;
            thumbCtx.drawImage(this.canvas, 0, 0, thumbWidth, thumbHeight);
            const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.7);

            if (this.onCaptureCallback) {
                this.onCaptureCallback(fullBlob, thumbnailBase64);
            }
            this.closeScanner();
        }, 'image/jpeg', 0.9);
    }

    onCapture(callback) {
        this.onCaptureCallback = callback;
    }
}

// Instantiate only after DOM is ready so getElementById calls succeed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ScannerManager = new ScannerManager();
    });
} else {
    window.ScannerManager = new ScannerManager();
}

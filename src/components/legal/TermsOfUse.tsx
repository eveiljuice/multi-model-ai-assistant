import React from 'react';
import { X } from 'lucide-react';

interface TermsOfUseProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfUse: React.FC<TermsOfUseProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Terms of Use</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h3>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using Donein5 ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Use of Service</h3>
            <p className="text-gray-700 leading-relaxed">
              You may use our Service for lawful purposes only. You agree not to use the Service:
            </p>
            <ul className="mt-2 space-y-1 text-gray-700 ml-4">
              <li>• In any way that violates any applicable law or regulation</li>
              <li>• To attempt to gain unauthorized access to our systems</li>
              <li>• To interfere with or disrupt the Service or servers</li>
              <li>• To transmit malicious code or harmful content</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">3. AI Services</h3>
            <p className="text-gray-700 leading-relaxed">
              Our Service provides access to AI models and tools. We do not guarantee the accuracy, completeness, or reliability of AI-generated content. Users are responsible for verifying and validating any information or results obtained through our Service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">4. User Accounts</h3>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Payment and Credits</h3>
            <p className="text-gray-700 leading-relaxed">
              Access to certain features may require payment. Credits purchased are non-refundable unless otherwise specified. We reserve the right to modify pricing at any time with notice.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Limitation of Liability</h3>
            <p className="text-gray-700 leading-relaxed">
              In no event shall Donein5 be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Termination</h3>
            <p className="text-gray-700 leading-relaxed">
              We may terminate or suspend your account at any time, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Changes to Terms</h3>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms on this page.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">9. Contact Information</h3>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-2 space-y-1 text-gray-700">
              <p>Email: info@donein5.com</p>
              <p>Phone: +971 508 513 127</p>
            </div>
          </section>

          <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse; 
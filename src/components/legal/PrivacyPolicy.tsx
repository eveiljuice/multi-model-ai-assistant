import React from 'react';
import { X } from 'lucide-react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2"><strong>Personal Information:</strong></p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Email address</li>
                <li>• Name and profile information</li>
                <li>• Payment information (processed securely by Stripe)</li>
                <li>• Communication preferences</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Your Information</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>• Provide, maintain, and improve our Service</li>
              <li>• Process transactions and send related information</li>
              <li>• Send technical notices and security alerts</li>
              <li>• Respond to your comments and questions</li>
              <li>• Monitor and analyze usage patterns</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Information Sharing</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We do not sell, trade, or otherwise transfer your personal information to third parties except:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>• With your consent</li>
              <li>• To service providers who assist us in operating our Service</li>
              <li>• To comply with legal obligations</li>
              <li>• To protect our rights and safety</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">4. AI Processing</h3>
            <p className="text-gray-700 leading-relaxed">
              Your conversations and queries may be processed by third-party AI services. We implement appropriate safeguards to protect your data during processing. We do not store your conversation content longer than necessary for service provision.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Data Security</h3>
            <p className="text-gray-700 leading-relaxed">
              We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Data Retention</h3>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information only as long as necessary to provide our Service and comply with legal obligations. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Cookies and Tracking</h3>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar technologies to enhance your experience and analyze service usage. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Your Rights</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You have the right to:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>• Access your personal information</li>
              <li>• Correct inaccurate information</li>
              <li>• Request deletion of your data</li>
              <li>• Opt out of marketing communications</li>
              <li>• Data portability</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">9. Children's Privacy</h3>
            <p className="text-gray-700 leading-relaxed">
              Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to Privacy Policy</h3>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "last updated" date.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Us</h3>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
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

export default PrivacyPolicy; 
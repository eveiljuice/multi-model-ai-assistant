import React, { useState } from 'react';
import { Lightbulb, MessageCircle, AlertCircle, Mail, Phone, FileText, Shield } from 'lucide-react';
import SuggestIdeaModal from './SuggestIdeaModal';
import TermsOfUse from './legal/TermsOfUse';
import PrivacyPolicy from './legal/PrivacyPolicy';

const Footer: React.FC = () => {
  const [isSuggestIdeaModalOpen, setIsSuggestIdeaModalOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                This is a beta version of the project. Bugs are possible.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">D5</span>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Donein5</span>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Any questions?</h4>
                <div className="flex flex-col space-y-2">
                  <a
                    href="mailto:support@agentcore.com"
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>support@agentcore.com</span>
                  </a>
                  <span className="text-sm text-gray-600">
                    We always try to answer you as soon as possible.
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Us</h3>
              <div className="space-y-3">
                <a
                  href="mailto:info@donein5.com"
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>info@donein5.com</span>
                </a>
                <a
                  href="tel:+971508513127"
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Phone className="h-4 w-4" />
                  <span>+971 508 513 127</span>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Legal & Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setIsTermsOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Terms of Use</span>
                </button>
                <button
                  onClick={() => setIsPrivacyOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Privacy Policy</span>
                </button>
                <button
                  onClick={() => setIsSuggestIdeaModalOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span>Suggest an Idea</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <span className="text-sm text-gray-600">© {currentYear} Donein5</span>
          </div>
        </div>
      </footer>

      <SuggestIdeaModal
        isOpen={isSuggestIdeaModalOpen}
        onClose={() => setIsSuggestIdeaModalOpen(false)}
      />

      <TermsOfUse
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <PrivacyPolicy
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </>
  );
};

export default Footer;
import Firera from '../../firera';
import rootComponent from './components/root';
import photoUploadPopupComponent from './components/photo_upload_popup';


const app = Firera({
	$packages: ['htmlCells', 'ozenfant'],
	$root: rootComponent,
	popup: photoUploadPopupComponent,
})


dispatchEvent(new Event('click'), document.querySelector('.show-photo-upload-popup'));
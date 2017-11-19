import Firera from '../../firera';
import rootComponent from './components/root';
import photoUploadPopupComponent from './components/photo_upload_popup';


const app = Firera({
	$root: rootComponent,
	popup: photoUploadPopupComponent,
}, {
	packages: ['htmlCells', 'ozenfant'],
	//trackChanges: true,
	trackChangesType: 'imm',
})


dispatchEvent(new Event('click'), document.querySelector('.show-photo-upload-popup'));
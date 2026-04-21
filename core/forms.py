from django import forms


class OrderCreateForm(forms.Form):
    email = forms.EmailField(label="Email")
    video_file = forms.FileField(label="Vídeo")
    requested_cuts = forms.IntegerField(min_value=1, max_value=20, initial=1, label="Quantidade de cortes")
